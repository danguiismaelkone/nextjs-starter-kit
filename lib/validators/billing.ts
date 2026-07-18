import { z } from "zod"

/**
 * Chemin relatif same-origin uniquement (ITEM-074) : `/onboarding`, jamais une
 * URL absolue ni protocol-relative (`//evil.com`) — sinon
 * `POST /api/billing/checkout` deviendrait un open redirect via Stripe
 * Checkout (`success_url`/`cancel_url` construits à partir de cette valeur).
 */
const RETURN_TO_REGEX = /^\/(?!\/|\\)[^\s]*$/

export const planIdSchema = z.object({
  planId: z.string().trim().min(1, "Plan invalide."),
  returnTo: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || RETURN_TO_REGEX.test(value), "Retour invalide."),
})
