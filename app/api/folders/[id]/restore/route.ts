import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getCurrentOrganization } from "@/lib/organization"
import { prisma } from "@/lib/prisma"
import { restoreFolderTree } from "@/lib/documents"

/** Restaure un dossier depuis la corbeille avec tout son contenu et ses ancêtres supprimés. */
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

  const folder = await prisma.folder.findFirst({
    where: { id, organizationId: organization.id, deletedAt: { not: null } },
  })
  if (!folder) {
    return NextResponse.json({ error: "Dossier introuvable dans la corbeille." }, { status: 404 })
  }

  await restoreFolderTree(organization.id, folder.id)

  return NextResponse.json({ success: true })
}
