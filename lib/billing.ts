import type Stripe from "stripe"
import { prisma } from "@/lib/prisma"
import { getStripeClient } from "@/lib/stripe"
import { triggerWebhooks } from "@/lib/webhooks"
import { logger } from "@/lib/logger"

/** Durée de l'essai gratuit, configurable via `TRIAL_PERIOD_DAYS` (défaut 14 jours). */
export const TRIAL_PERIOD_DAYS = Number(process.env.TRIAL_PERIOD_DAYS) || 14

/**
 * Owner (rôle `owner`, adhésion active) d'une organisation — la facturation
 * est rattachée à cet utilisateur, pas à l'organisation elle-même (ITEM-094).
 * `null` si l'organisation n'a pas (ou plus) d'owner actif ; ne devrait pas
 * arriver en pratique, `createOrganizationWithOwner` en crée toujours un.
 */
export async function getOrganizationOwnerId(organizationId: string): Promise<string | null> {
  const membership = await prisma.membership.findFirst({
    where: { organizationId, role: "owner", status: "active" },
    select: { userId: true },
  })
  return membership?.userId ?? null
}

/**
 * Démarre l'essai gratuit d'un utilisateur owner à la création de sa première
 * organisation (onboarding, ITEM-014) : aucun plan choisi, aucune carte
 * requise — juste une fenêtre `trialing` avant que l'accès aux
 * fonctionnalités payantes ne soit restreint (voir `hasActiveEntitlement`).
 * Un owner n'a jamais plus d'un abonnement (ITEM-094) : couvre déjà toutes
 * ses organisations, présentes et futures (ITEM-093).
 */
export async function startTrialSubscription(ownerId: string): Promise<void> {
  const trialEnd = new Date()
  trialEnd.setDate(trialEnd.getDate() + TRIAL_PERIOD_DAYS)

  await prisma.subscription.create({
    data: {
      ownerId,
      status: "trialing",
      currentPeriodEnd: trialEnd,
    },
  })
}

/**
 * Une organisation a accès aux fonctionnalités payantes tant que l'abonnement
 * de son owner (ITEM-094) est en essai ou activement abonné, et que la
 * période en cours n'est pas expirée. Fondation réutilisable par les futures
 * pages à restreindre (aucune n'existe encore dans ce socle SaaS) — pas de
 * blocage appliqué par cet item lui-même.
 */
export async function hasActiveEntitlement(organizationId: string): Promise<boolean> {
  const ownerId = await getOrganizationOwnerId(organizationId)
  if (!ownerId) return false
  const subscription = await prisma.subscription.findUnique({ where: { ownerId } })
  if (!subscription) return false
  if (subscription.status !== "trialing" && subscription.status !== "active") return false
  return subscription.currentPeriodEnd.getTime() > Date.now()
}

/**
 * Une organisation est sur le plan `planName` si l'abonnement de son owner
 * (au plus un par owner, ITEM-094) y pointe — indépendamment du statut
 * (`active`/`trialing`/...), pour rester cohérent avec `hasActiveEntitlement`
 * qui gère déjà la fraîcheur de la période.
 */
async function organizationHasPlan(organizationId: string, planName: string): Promise<boolean> {
  const ownerId = await getOrganizationOwnerId(organizationId)
  if (!ownerId) return false
  const subscription = await prisma.subscription.findUnique({
    where: { ownerId },
    include: { plan: true },
  })
  return subscription?.plan?.name === planName
}

/** Nom du plan réservant les rôles custom (ITEM-066) — voir seed `DEFAULT_PLANS`. */
export const ENTERPRISE_PLAN_NAME = "Enterprise"

/** Une organisation est "Enterprise" — voir `organizationHasPlan`. */
export function isEnterpriseOrganization(organizationId: string): Promise<boolean> {
  return organizationHasPlan(organizationId, ENTERPRISE_PLAN_NAME)
}

/** Nom du plan réservant le masquage de la marque d'origine (ITEM-069) — voir seed `DEFAULT_PLANS`. */
export const WHITE_LABEL_PLAN_NAME = "White Label"

/** Une organisation est "White Label" — voir `organizationHasPlan`. */
export function isWhiteLabelOrganization(organizationId: string): Promise<boolean> {
  return organizationHasPlan(organizationId, WHITE_LABEL_PLAN_NAME)
}

/**
 * Upsert idempotent de l'abonnement local depuis un objet Stripe `Subscription` :
 * rejouer le même événement (webhook Stripe, ou retour de Checkout) écrase les
 * mêmes valeurs sans dupliquer de ligne — `Subscription.ownerId` est
 * unique (ITEM-094).
 */
export async function upsertSubscriptionFromStripe(
  ownerId: string,
  planId: string,
  subscription: Stripe.Subscription
): Promise<void> {
  const currentPeriodEnd = subscription.items.data[0]?.current_period_end
  if (!currentPeriodEnd) return

  const data = {
    planId,
    status: subscription.status,
    currentPeriodEnd: new Date(currentPeriodEnd * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    stripeSubscriptionId: subscription.id,
  }

  await prisma.subscription.upsert({
    where: { ownerId },
    create: { ownerId, ...data },
    update: data,
  })
}

/**
 * Variante utilisée par les événements `customer.subscription.*` (pas de
 * `metadata.ownerId`/`planId` sur ces objets, contrairement à un Checkout
 * Session) : retrouve l'owner via `stripeCustomerId` (ITEM-094,
 * `User.stripeCustomerId`) et le plan via le `Price` Stripe de la ligne
 * d'abonnement.
 */
export async function syncSubscriptionFromStripeSubscription(subscription: Stripe.Subscription): Promise<void> {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id

  const owner = await prisma.user.findUnique({ where: { stripeCustomerId: customerId } })
  if (!owner) return // client Stripe non rattaché à un owner connu localement

  const price = subscription.items.data[0]?.price
  const priceId = typeof price === "string" ? price : price?.id
  const plan = priceId ? await prisma.plan.findUnique({ where: { stripePriceId: priceId } }) : null
  if (!plan) return // prix Stripe non répertorié parmi nos plans locaux

  await upsertSubscriptionFromStripe(owner.id, plan.id, subscription)
}

/** Upsert idempotent d'une facture, clé sur `stripeInvoiceId` (unique, ITEM-020). */
export async function recordInvoiceFromStripe(invoice: Stripe.Invoice): Promise<void> {
  const subscriptionRef = invoice.parent?.subscription_details?.subscription
  const stripeSubscriptionId = typeof subscriptionRef === "string" ? subscriptionRef : subscriptionRef?.id
  if (!stripeSubscriptionId || !invoice.id) return

  const localSubscription = await prisma.subscription.findUnique({ where: { stripeSubscriptionId } })
  if (!localSubscription) return // abonnement pas encore synchronisé localement

  const data = {
    subscriptionId: localSubscription.id,
    amount: invoice.amount_paid || invoice.amount_due,
    currency: invoice.currency,
    status: invoice.status ?? "open",
    invoicePdfUrl: invoice.invoice_pdf ?? null,
    issuedAt: new Date(invoice.created * 1000),
  }

  const record = await prisma.invoice.upsert({
    where: { stripeInvoiceId: invoice.id },
    create: { stripeInvoiceId: invoice.id, ...data },
    update: data,
  })

  // Best-effort (ITEM-048) : `triggerWebhooks` ne lève jamais — un échec de
  // livraison webhook ne doit pas remonter au webhook Stripe appelant (qui
  // retenterait sinon indéfiniment un traitement pourtant déjà réussi).
  // Les webhooks sortants restent scoped par organisation (`Webhook.organizationId`,
  // ITEM-048) alors que l'abonnement est désormais par owner (ITEM-094) et peut
  // couvrir plusieurs organisations (ITEM-093) : déclenche pour chacune d'elles.
  if (data.status === "paid") {
    const ownedOrganizations = await prisma.membership.findMany({
      where: { userId: localSubscription.ownerId, role: "owner", status: "active" },
      select: { organizationId: true },
    })
    await Promise.all(
      ownedOrganizations.map(({ organizationId }) =>
        triggerWebhooks(organizationId, "invoice.paid", {
          invoiceId: record.id,
          amount: record.amount,
          currency: record.currency,
        }).catch((err) => {
          logger.warn("Échec du déclenchement webhook invoice.paid", {
            organizationId,
            invoiceId: record.id,
            error: err,
          })
        })
      )
    )
  }
}

/**
 * Retour de Stripe Checkout (`session_id` dans l'URL de succès) : relit la
 * session côté Stripe et synchronise immédiatement l'abonnement local, en
 * secours du webhook (`checkout.session.completed`, ITEM-022) qui reste la
 * source de vérité pour les événements ultérieurs.
 */
export async function syncSubscriptionFromCheckoutSession(checkoutSessionId: string, ownerId: string): Promise<void> {
  const stripe = getStripeClient()
  if (!stripe) return

  const checkoutSession = await stripe.checkout.sessions
    .retrieve(checkoutSessionId, { expand: ["subscription"] })
    .catch(() => null)
  if (!checkoutSession || checkoutSession.metadata?.ownerId !== ownerId) return

  const subscription = checkoutSession.subscription
  const planId = checkoutSession.metadata?.planId
  if (!subscription || typeof subscription === "string" || !planId) return

  await upsertSubscriptionFromStripe(ownerId, planId, subscription)
}
