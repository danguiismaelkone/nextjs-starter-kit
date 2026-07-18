import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getOrganizationOwnerId } from "@/lib/billing"
import { getCurrentOrganization } from "@/lib/organization"
import { hasPermission } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { getStripeClient } from "@/lib/stripe"

/**
 * Crée une session du Stripe Billing Portal pour l'owner de l'organisation
 * active (ITEM-094 : le client Stripe est rattaché à l'owner, pas à
 * l'organisation), afin qu'il puisse gérer son moyen de paiement (et
 * consulter son historique de facturation côté Stripe) sans qu'on ait à
 * reconstruire cette UI nous-mêmes. Réservé à l'owner lui-même (pas à tout
 * admin de l'organisation) : le portail expose le moyen de paiement personnel
 * de l'owner, potentiellement partagé par plusieurs organisations (ITEM-093).
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
      { error: "Seul le propriétaire de l'organisation peut gérer l'abonnement." },
      { status: 403 }
    )
  }

  const stripe = getStripeClient()
  if (!stripe) {
    return NextResponse.json(
      { error: "Facturation Stripe non configurée (STRIPE_SECRET_KEY manquante)." },
      { status: 503 }
    )
  }

  const owner = await prisma.user.findUniqueOrThrow({ where: { id: ownerId } })
  if (!owner.stripeCustomerId) {
    return NextResponse.json({ error: "Aucun client Stripe rattaché à ce compte." }, { status: 422 })
  }

  const origin = request.headers.get("origin") ?? new URL(request.url).origin

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: owner.stripeCustomerId,
    return_url: `${origin}/billing`,
  })

  return NextResponse.json({ url: portalSession.url })
}
