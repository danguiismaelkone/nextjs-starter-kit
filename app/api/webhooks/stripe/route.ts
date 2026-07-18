import type Stripe from "stripe"
import { NextResponse } from "next/server"
import { getStripeClient } from "@/lib/stripe"
import {
  recordInvoiceFromStripe,
  syncSubscriptionFromCheckoutSession,
  syncSubscriptionFromStripeSubscription,
} from "@/lib/billing"
import { logger } from "@/lib/logger"

/**
 * Endpoint public (pas de session applicative) : Stripe est la seule partie
 * appelante attendue, authentifiée par la signature `stripe-signature` vérifiée
 * via `STRIPE_WEBHOOK_SECRET` — jamais par un cookie/session utilisateur.
 */
export async function POST(request: Request) {
  const stripe = getStripeClient()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!stripe || !webhookSecret) {
    logger.error("Webhook Stripe non configuré (STRIPE_SECRET_KEY et/ou STRIPE_WEBHOOK_SECRET manquants)", undefined, {
      route: "webhooks/stripe",
    })
    return NextResponse.json({ error: "Webhook Stripe non configuré." }, { status: 503 })
  }

  const signature = request.headers.get("stripe-signature")
  if (!signature) {
    return NextResponse.json({ error: "Signature Stripe manquante." }, { status: 400 })
  }

  // Corps brut requis par `constructEvent` (la vérification de signature porte
  // sur les octets exacts envoyés par Stripe) — jamais `request.json()` ici.
  const payload = await request.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)
  } catch (err) {
    logger.warn("Signature Stripe invalide", { route: "webhooks/stripe", error: err })
    return NextResponse.json({ error: "Signature invalide." }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const ownerId = session.metadata?.ownerId
        if (ownerId) {
          await syncSubscriptionFromCheckoutSession(session.id, ownerId)
        }
        break
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncSubscriptionFromStripeSubscription(event.data.object as Stripe.Subscription)
        break
      }
      case "invoice.paid":
      case "invoice.payment_failed": {
        await recordInvoiceFromStripe(event.data.object as Stripe.Invoice)
        break
      }
      default:
        // Événement hors périmètre de la synchronisation billing : accusé
        // réception sans traitement pour ne pas déclencher de retries Stripe.
        break
    }
  } catch (err) {
    logger.error("Échec de traitement d'un événement webhook Stripe", err, {
      route: "webhooks/stripe",
      eventType: event.type,
      eventId: event.id,
    })
    return NextResponse.json({ error: "Échec de traitement." }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
