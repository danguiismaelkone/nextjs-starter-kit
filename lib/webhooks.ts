import { randomBytes, createHmac } from "node:crypto"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"
import { WEBHOOK_EVENT_TYPES, type WebhookEventType } from "@/lib/webhook-events"
import { logger } from "@/lib/logger"

export { WEBHOOK_EVENT_TYPES, type WebhookEventType }

const DELIVERY_TIMEOUT_MS = 10_000

function generateSecret(): string {
  return `whsec_${randomBytes(24).toString("hex")}`
}

export function signWebhookPayload(secret: string, rawBody: string): string {
  return createHmac("sha256", secret).update(rawBody).digest("hex")
}

export interface CreateWebhookInput {
  organizationId: string
  url: string
  events: WebhookEventType[]
  createdById: string
}

export async function createWebhook({ organizationId, url, events, createdById }: CreateWebhookInput) {
  return prisma.webhook.create({
    data: { organizationId, url, events, secret: generateSecret(), createdById },
  })
}

/** Webhooks de l'organisation, du plus récent au plus ancien. */
export async function listWebhooks(organizationId: string) {
  return prisma.webhook.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { name: true } } },
  })
}

/** Supprime un webhook (et son historique, `onDelete: Cascade`) — no-op s'il n'appartient pas à l'organisation. */
export async function deleteWebhook(organizationId: string, webhookId: string): Promise<boolean> {
  const { count } = await prisma.webhook.deleteMany({ where: { id: webhookId, organizationId } })
  return count > 0
}

/** Historique des envois d'un webhook, du plus récent au plus ancien. */
export async function listDeliveries(webhookId: string, limit = 20) {
  return prisma.webhookDelivery.findMany({
    where: { webhookId },
    orderBy: { createdAt: "desc" },
    take: limit,
  })
}

/** Envoie une requête HTTP signée vers `webhook.url` et journalise le résultat — jamais d'exception propagée à l'appelant. */
async function deliver(webhook: { id: string; url: string; secret: string }, event: string, payload: Prisma.InputJsonValue) {
  const body = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() })
  const signature = signWebhookPayload(webhook.secret, body)

  let statusCode: number | null = null
  let success = false
  let errorMessage: string | null = null

  try {
    const response = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Event": event,
        "X-Webhook-Signature": `sha256=${signature}`,
      },
      body,
      signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
    })
    statusCode = response.status
    success = response.ok
    if (!success) errorMessage = `Réponse HTTP ${response.status}`
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : "Échec de la requête."
  }

  await prisma.webhookDelivery.create({
    data: { webhookId: webhook.id, event, payload, statusCode, success, errorMessage },
  })
}

/**
 * Déclenche les webhooks actifs de l'organisation souscrits à `event`
 * (best-effort, en parallèle) — ne doit jamais faire échouer l'appelant
 * (invitation acceptée, facture enregistrée, etc.), d'où l'absence de throw.
 */
export async function triggerWebhooks(
  organizationId: string,
  event: WebhookEventType,
  payload: Prisma.InputJsonValue
): Promise<void> {
  const webhooks = await prisma.webhook.findMany({
    where: { organizationId, enabled: true, events: { has: event } },
  })
  if (webhooks.length === 0) return

  await Promise.all(
    webhooks.map((webhook) =>
      deliver(webhook, event, payload).catch((err) => {
        logger.warn("Échec inattendu de l'envoi d'un webhook sortant", {
          organizationId,
          webhookId: webhook.id,
          webhookUrl: webhook.url,
          event,
          error: err,
        })
      })
    )
  )
}

/** Renvoie manuellement une livraison passée vers le même webhook (ITEM-048) — crée une nouvelle entrée d'historique. */
export async function redeliverWebhook(organizationId: string, webhookId: string, deliveryId: string): Promise<boolean> {
  const webhook = await prisma.webhook.findFirst({ where: { id: webhookId, organizationId } })
  if (!webhook) return false

  const delivery = await prisma.webhookDelivery.findFirst({ where: { id: deliveryId, webhookId } })
  if (!delivery) return false

  await deliver(webhook, delivery.event, delivery.payload as Prisma.InputJsonValue)
  return true
}
