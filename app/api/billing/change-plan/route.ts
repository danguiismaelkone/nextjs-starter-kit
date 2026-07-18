import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getCurrentOrganization } from "@/lib/organization"
import { hasPermission } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { getStripeClient } from "@/lib/stripe"
import { getOrganizationOwnerId, upsertSubscriptionFromStripe } from "@/lib/billing"
import { logAudit } from "@/lib/audit"
import { parseJsonBody } from "@/lib/validation"
import { planIdSchema } from "@/lib/validators/billing"

/**
 * Change le plan d'un abonnement Stripe déjà actif (upgrade/downgrade,
 * ITEM-024) — distinct de `app/api/billing/checkout/route.ts` (ITEM-021), qui
 * ne s'applique qu'à une toute première souscription sans abonnement Stripe
 * existant.
 *
 * Proratisation entièrement déléguée à Stripe (`proration_behavior`), jamais
 * calculée côté app :
 * - upgrade (nouveau prix > prix actuel) : appliqué immédiatement avec
 *   proration (`create_prorations`).
 * - downgrade (ou prix égal) : programmé via un `SubscriptionSchedule` à deux
 *   phases pour ne prendre effet qu'à la fin de la période en cours, sans
 *   proration.
 */
export async function POST(request: Request) {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 })
  }

  const organization = await getCurrentOrganization()
  if (!organization) {
    return NextResponse.json({ error: "Organisation introuvable." }, { status: 404 })
  }

  const allowed = await hasPermission(session.user.id, organization.id, "admin", "access")
  if (!allowed) {
    return NextResponse.json({ error: "Action réservée aux admins de l'organisation." }, { status: 403 })
  }

  const ownerId = await getOrganizationOwnerId(organization.id)
  if (session.user.id !== ownerId) {
    return NextResponse.json(
      { error: "Seul le propriétaire de l'organisation peut changer de plan." },
      { status: 403 }
    )
  }

  const parsed = await parseJsonBody(request, planIdSchema)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.message }, { status: 400 })
  }
  const { planId } = parsed.data

  const localSubscription = await prisma.subscription.findUnique({ where: { ownerId } })
  if (!localSubscription?.stripeSubscriptionId || !localSubscription.planId) {
    return NextResponse.json(
      { error: "Aucun abonnement payant actif à modifier — utilisez la souscription initiale." },
      { status: 409 }
    )
  }

  const [currentPlan, newPlan] = await Promise.all([
    prisma.plan.findUnique({ where: { id: localSubscription.planId } }),
    prisma.plan.findUnique({ where: { id: planId } }),
  ])
  if (!currentPlan || !newPlan || !newPlan.isActive) {
    return NextResponse.json({ error: "Plan introuvable." }, { status: 404 })
  }
  if (newPlan.id === currentPlan.id) {
    return NextResponse.json({ error: "L'organisation est déjà sur ce plan." }, { status: 400 })
  }
  if (!newPlan.stripePriceId) {
    return NextResponse.json(
      { error: "Ce plan n'est pas encore configuré pour la facturation Stripe." },
      { status: 422 }
    )
  }

  const stripe = getStripeClient()
  if (!stripe) {
    return NextResponse.json(
      { error: "Facturation Stripe non configurée (STRIPE_SECRET_KEY manquante)." },
      { status: 503 }
    )
  }

  const stripeSubscriptionId = localSubscription.stripeSubscriptionId
  const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId)
  const currentItem = stripeSubscription.items.data[0]
  if (!currentItem) {
    return NextResponse.json({ error: "Abonnement Stripe invalide (aucune ligne)." }, { status: 502 })
  }

  const isUpgrade = newPlan.price > currentPlan.price

  if (isUpgrade) {
    await stripe.subscriptions.update(stripeSubscriptionId, {
      items: [{ id: currentItem.id, price: newPlan.stripePriceId }],
      proration_behavior: "create_prorations",
    })
    const updated = await stripe.subscriptions.retrieve(stripeSubscriptionId)
    await upsertSubscriptionFromStripe(ownerId, newPlan.id, updated)
    await logAudit({
      organizationId: organization.id,
      actorId: session.user.id,
      action: "billing.plan_changed",
      targetType: "Subscription",
      targetId: localSubscription.id,
      metadata: { from: currentPlan.name, to: newPlan.name, immediate: true },
    })
    return NextResponse.json({ immediate: true })
  }

  // Downgrade : le plan actuel reste facturé jusqu'à la fin de la période en
  // cours, puis le nouveau prend le relais — Stripe gère la transition, notre
  // webhook (`customer.subscription.updated`, ITEM-022) synchronisera l'état
  // local quand elle aura lieu.
  const schedule = await stripe.subscriptionSchedules.create({ from_subscription: stripeSubscriptionId })
  const currentPhase = schedule.phases[0]
  const updatedSchedule = await stripe.subscriptionSchedules.update(schedule.id, {
    end_behavior: "release",
    proration_behavior: "none",
    phases: [
      {
        items: [{ price: currentItem.price.id, quantity: currentItem.quantity }],
        start_date: currentPhase.start_date,
        end_date: currentPhase.end_date,
      },
      {
        items: [{ price: newPlan.stripePriceId, quantity: 1 }],
      },
    ],
  })

  const effectiveAt = updatedSchedule.phases[0]?.end_date
  await logAudit({
    organizationId: organization.id,
    actorId: session.user.id,
    action: "billing.plan_changed",
    targetType: "Subscription",
    targetId: localSubscription.id,
    metadata: { from: currentPlan.name, to: newPlan.name, immediate: false },
  })
  return NextResponse.json({
    scheduled: true,
    effectiveAt: effectiveAt ? new Date(effectiveAt * 1000).toISOString() : null,
  })
}
