import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getCurrentOrganization } from "@/lib/organization"
import { revokeApiKey } from "@/lib/api-keys"
import { logAudit } from "@/lib/audit"

/** Révoque une clé API — effet immédiat (critère d'acceptation ITEM-047). */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 })
  }

  const organization = await getCurrentOrganization()
  if (!organization) {
    return NextResponse.json({ error: "Organisation introuvable." }, { status: 404 })
  }
  if (organization.role !== "owner" && organization.role !== "admin") {
    return NextResponse.json({ error: "Réservé aux administrateurs de l'organisation." }, { status: 403 })
  }

  const revoked = await revokeApiKey(organization.id, id)
  if (!revoked) {
    return NextResponse.json({ error: "Clé introuvable ou déjà révoquée." }, { status: 404 })
  }

  await logAudit({
    organizationId: organization.id,
    actorId: session.user.id,
    action: "api_key.revoked",
    targetType: "ApiKey",
    targetId: id,
  })

  return NextResponse.json({ success: true })
}
