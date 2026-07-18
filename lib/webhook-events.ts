/**
 * Catalogue des types d'événements webhook sélectionnables (ITEM-048), séparé
 * de `lib/webhooks.ts` pour rester importable depuis un composant client
 * (`lib/webhooks.ts` importe `node:crypto`/Prisma, qui casserait le bundle
 * client). Chaque clé correspond à un point de déclenchement réel déjà
 * branché dans l'app (`app/invite/accept/actions.ts`, `lib/billing.ts`).
 */
export const WEBHOOK_EVENT_TYPES = {
  "member.joined": "Un membre rejoint l'organisation",
  "invoice.paid": "Une facture est payée",
} as const

export type WebhookEventType = keyof typeof WEBHOOK_EVENT_TYPES
