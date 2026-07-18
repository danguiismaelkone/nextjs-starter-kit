import { NextResponse } from "next/server"
import { requireOrganizationAdmin } from "@/lib/organization"
import { deleteWebhook } from "@/lib/webhooks"
import { logAudit } from "@/lib/audit"

/** Supprime un webhook (et son historique de livraisons). */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await requireOrganizationAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const deleted = await deleteWebhook(auth.organization.id, id)
  if (!deleted) {
    return NextResponse.json({ error: "Webhook introuvable." }, { status: 404 })
  }

  await logAudit({
    organizationId: auth.organization.id,
    actorId: auth.userId,
    action: "webhook.deleted",
    targetType: "Webhook",
    targetId: id,
  })

  return NextResponse.json({ success: true })
}
