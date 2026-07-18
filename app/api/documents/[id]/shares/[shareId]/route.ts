import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getCurrentOrganization } from "@/lib/organization"
import { prisma } from "@/lib/prisma"

/** Révoque un lien de partage — n'importe quel membre actif de l'organisation, pas seulement son créateur. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; shareId: string }> }
) {
  const { id, shareId } = await params
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 })
  }

  const organization = await getCurrentOrganization()
  if (!organization) {
    return NextResponse.json({ error: "Organisation introuvable." }, { status: 404 })
  }

  const share = await prisma.documentShare.findFirst({
    where: { id: shareId, documentId: id, document: { organizationId: organization.id } },
  })
  if (!share) {
    return NextResponse.json({ error: "Lien de partage introuvable." }, { status: 404 })
  }

  if (!share.revokedAt) {
    await prisma.documentShare.update({ where: { id: share.id }, data: { revokedAt: new Date() } })
  }

  return NextResponse.json({ success: true })
}
