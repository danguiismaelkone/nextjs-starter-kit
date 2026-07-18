import { NextResponse } from "next/server"
import { requireOrganizationAdmin } from "@/lib/organization"
import { createWebhook, listWebhooks, type WebhookEventType } from "@/lib/webhooks"
import { parseJsonBody } from "@/lib/validation"
import { createWebhookSchema } from "@/lib/validators/settings"

/** Liste les webhooks de l'organisation active. */
export async function GET() {
  const auth = await requireOrganizationAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const webhooks = await listWebhooks(auth.organization.id)

  return NextResponse.json({
    // Jamais `secret` ici : seule la réponse de création (POST) le révèle,
    // une seule fois (critère d'acceptation, cf. ApiKey/ITEM-047).
    webhooks: webhooks.map((webhook) => ({
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      enabled: webhook.enabled,
      createdAt: webhook.createdAt,
      createdByName: webhook.createdBy?.name ?? null,
    })),
  })
}

/** Crée un nouveau webhook — retourne le secret HMAC en clair. */
export async function POST(request: Request) {
  const auth = await requireOrganizationAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const parsed = await parseJsonBody(request, createWebhookSchema)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.message }, { status: 400 })
  }
  const { url, events } = parsed.data

  const webhook = await createWebhook({
    organizationId: auth.organization.id,
    url,
    events: events as WebhookEventType[],
    createdById: auth.userId,
  })

  return NextResponse.json({
    webhook: {
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      enabled: webhook.enabled,
      secret: webhook.secret,
      createdAt: webhook.createdAt,
      createdByName: null,
    },
  })
}
