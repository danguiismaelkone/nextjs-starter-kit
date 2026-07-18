import { NextResponse } from "next/server"
import { requireOrganizationAdmin } from "@/lib/organization"
import { redeliverWebhook, listDeliveries } from "@/lib/webhooks"

/** Renvoie manuellement une livraison passée (ITEM-048) — crée une nouvelle entrée d'historique. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; deliveryId: string }> }
) {
  const { id, deliveryId } = await params
  const auth = await requireOrganizationAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const redelivered = await redeliverWebhook(auth.organization.id, id, deliveryId)
  if (!redelivered) {
    return NextResponse.json({ error: "Webhook ou livraison introuvable." }, { status: 404 })
  }

  const [latest] = await listDeliveries(id, 1)

  return NextResponse.json({
    delivery: latest
      ? {
          id: latest.id,
          event: latest.event,
          statusCode: latest.statusCode,
          success: latest.success,
          errorMessage: latest.errorMessage,
          createdAt: latest.createdAt,
        }
      : null,
  })
}
