import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getCurrentOrganization } from "@/lib/organization"
import { prisma } from "@/lib/prisma"
import { restoreDocument } from "@/lib/documents"

/** Restaure un document depuis la corbeille (+ son dossier parent et ses ancêtres, s'ils étaient eux aussi supprimés). */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 })
  }

  const organization = await getCurrentOrganization()
  if (!organization) {
    return NextResponse.json({ error: "Organisation introuvable." }, { status: 404 })
  }

  const document = await prisma.document.findFirst({
    where: { id, organizationId: organization.id, deletedAt: { not: null } },
  })
  if (!document) {
    return NextResponse.json({ error: "Document introuvable dans la corbeille." }, { status: 404 })
  }

  await restoreDocument(organization.id, document.id)

  return NextResponse.json({ success: true })
}
