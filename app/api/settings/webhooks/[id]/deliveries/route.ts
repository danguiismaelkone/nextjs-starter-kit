import { NextResponse } from "next/server"
import { requireOrganizationAdmin } from "@/lib/organization"
import { prisma } from "@/lib/prisma"
import { listDeliveries } from "@/lib/webhooks"

/** Historique des envois d'un webhook (ITEM-048). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await requireOrganizationAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const webhook = await prisma.webhook.findFirst({ where: { id, organizationId: auth.organization.id } })
  if (!webhook) {
    return NextResponse.json({ error: "Webhook introuvable." }, { status: 404 })
  }

  const deliveries = await listDeliveries(webhook.id)

  return NextResponse.json({
    deliveries: deliveries.map((delivery) => ({
      id: delivery.id,
      event: delivery.event,
      statusCode: delivery.statusCode,
      success: delivery.success,
      errorMessage: delivery.errorMessage,
      createdAt: delivery.createdAt,
    })),
  })
}
