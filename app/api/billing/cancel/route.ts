import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getCurrentOrganization } from "@/lib/organization"
import { hasPermission } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { getStripeClient } from "@/lib/stripe"
import { getOrganizationOwnerId, upsertSubscriptionFromStripe } from "@/lib/billing"
import { logAudit } from "@/lib/audit"

/**
 * Résilie l'abonnement de l'organisation active à la fin de la période déjà
 * payée (`cancel_at_period_end`), sans remboursement au prorata par défaut —
 * jamais d'annulation immédiate (`stripe.subscriptions.cancel`), qui
 * couperait l'accès à une période déjà facturée.
 */
export async function POST() {
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
      { error: "Seul le propriétaire de l'organisation peut résilier l'abonnement." },
      { status: 403 }
    )
  }

  const localSubscription = await prisma.subscription.findUnique({ where: { ownerId } })
  if (!localSubscription?.stripeSubscriptionId || !localSubscription.planId) {
    return NextResponse.json({ error: "Aucun abonnement payant actif à résilier." }, { status: 409 })
  }
  if (localSubscription.cancelAtPeriodEnd) {
    return NextResponse.json({ error: "La résiliation est déjà programmée." }, { status: 400 })
  }

  const stripe = getStripeClient()
  if (!stripe) {
    return NextResponse.json(
      { error: "Facturation Stripe non configurée (STRIPE_SECRET_KEY manquante)." },
      { status: 503 }
    )
  }

  const updated = await stripe.subscriptions.update(localSubscription.stripeSubscriptionId, {
    cancel_at_period_end: true,
  })

  // Secours immédiat en attendant le webhook `customer.subscription.updated`
  // (ITEM-022), qui reste la source de vérité pour les événements ultérieurs.
  await upsertSubscriptionFromStripe(ownerId, localSubscription.planId, updated)

  await logAudit({
    organizationId: organization.id,
    actorId: session.user.id,
    action: "billing.subscription_canceled",
    targetType: "Subscription",
    targetId: localSubscription.id,
  })

  return NextResponse.json({ cancelAtPeriodEnd: true })
}
