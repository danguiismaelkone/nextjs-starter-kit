import Stripe from "stripe"

let cachedClient: Stripe | null | undefined

/**
 * Client Stripe paresseux : instancié au premier appel plutôt qu'au chargement
 * du module, pour ne pas faire planter le build si `STRIPE_SECRET_KEY` n'est
 * pas encore configurée (même approche que `getResendClient` dans lib/email.ts).
 */
export function getStripeClient(): Stripe | null {
  if (cachedClient !== undefined) return cachedClient

  const secretKey = process.env.STRIPE_SECRET_KEY
  cachedClient = secretKey ? new Stripe(secretKey) : null
  return cachedClient
}
