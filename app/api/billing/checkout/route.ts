import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getOrganizationOwnerId } from "@/lib/billing"
import { getCurrentOrganization } from "@/lib/organization"
import { hasPermission } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { getStripeClient } from "@/lib/stripe"
import { parseJsonBody } from "@/lib/validation"
import { planIdSchema } from "@/lib/validators/billing"

/**
 * Crée une session Stripe Checkout pour souscrire l'owner de l'organisation
 * active à un plan (ITEM-094 : la facturation est rattachée à l'utilisateur
 * owner, pas à l'organisation — un abonnement peut couvrir plusieurs
 * organisations, ITEM-093). Le client (bouton « Souscrire » de `PlanCard`)
 * redirige simplement vers l'URL Stripe retournée — pas de Stripe.js côté
 * client requis pour ce flux.
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

  // Seuls owner/admin de l'organisation peuvent engager une dépense pour elle.
  const allowed = await hasPermission(session.user.id, organization.id, "admin", "access")
  if (!allowed) {
    return NextResponse.json({ error: "Action réservée aux admins de l'organisation." }, { status: 403 })
  }

  const ownerId = await getOrganizationOwnerId(organization.id)
  if (!ownerId) {
    return NextResponse.json({ error: "Organisation sans propriétaire actif." }, { status: 422 })
  }

  const parsed = await parseJsonBody(request, planIdSchema)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.message }, { status: 400 })
  }
  const { planId, returnTo } = parsed.data

  const plan = await prisma.plan.findUnique({ where: { id: planId } })
  if (!plan || !plan.isActive) {
    return NextResponse.json({ error: "Plan introuvable." }, { status: 404 })
  }
  if (!plan.stripePriceId) {
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

  const owner = await prisma.user.findUniqueOrThrow({ where: { id: ownerId } })

  // Client Stripe créé au premier paiement et rattaché à l'owner (ITEM-094)
  // (réutilisé pour toute souscription ultérieure de ce même owner, quelle
  // que soit l'organisation active depuis laquelle il souscrit).
  let customerId = owner.stripeCustomerId
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: owner.email,
      name: owner.name,
      metadata: { ownerId: owner.id },
    })
    customerId = customer.id
    await prisma.user.update({
      where: { id: owner.id },
      data: { stripeCustomerId: customerId },
    })
  }

  const origin = request.headers.get("origin") ?? new URL(request.url).origin
  // `returnTo` (ITEM-074) : par défaut `/billing/plans`, comportement inchangé
  // pour le bouton « Souscrire » déjà utilisé là — l'assistant d'inscription
  // (ITEM-073) passe `/onboarding` pour revenir à son étape « Plan ».
  const returnPath = returnTo ?? "/billing/plans"

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    success_url: `${origin}${returnPath}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}${returnPath}?canceled=1`,
    metadata: { ownerId: owner.id, planId: plan.id },
    // Champ « code promo » natif de Stripe Checkout (ITEM-025) : validation,
    // messages d'erreur et application de la remise gérés par Stripe — pas de
    // logique de coupon dupliquée côté app.
    allow_promotion_codes: true,
  })

  if (!checkoutSession.url) {
    return NextResponse.json({ error: "Impossible de créer la session Stripe Checkout." }, { status: 502 })
  }

  return NextResponse.json({ url: checkoutSession.url })
}
