import { z } from "zod"
import { WEBHOOK_EVENT_TYPES, type WebhookEventType } from "@/lib/webhooks"

const VALID_EVENT_TYPES = Object.keys(WEBHOOK_EVENT_TYPES) as [WebhookEventType, ...WebhookEventType[]]

export const createApiKeySchema = z.object({
  name: z.string().trim().min(1, "Le nom de la clé est requis.").max(100, "Le nom est trop long."),
})

export const createWebhookSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, "URL invalide.")
    .refine((value) => {
      try {
        const url = new URL(value)
        return url.protocol === "https:" || url.protocol === "http:"
      } catch {
        return false
      }
    }, "URL invalide."),
  events: z
    .array(z.enum(VALID_EVENT_TYPES, { message: "Sélectionnez au moins un type d'événement valide." }))
    .min(1, "Sélectionnez au moins un type d'événement valide."),
})
