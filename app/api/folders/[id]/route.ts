import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getCurrentOrganization } from "@/lib/organization"
import { prisma } from "@/lib/prisma"
import { softDeleteFolderTree, wouldCreateCycle } from "@/lib/documents"
import { parseJsonBody } from "@/lib/validation"
import { updateFolderSchema } from "@/lib/validators/folders"

/** Renomme et/ou déplace (`parentId`) un dossier — glisser-déposer et menu contextuel côté client. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 })
  }

  const organization = await getCurrentOrganization()
  if (!organization) {
    return NextResponse.json({ error: "Organisation introuvable." }, { status: 404 })
  }

  const folder = await prisma.folder.findFirst({ where: { id, organizationId: organization.id, deletedAt: null } })
  if (!folder) {
    return NextResponse.json({ error: "Dossier introuvable." }, { status: 404 })
  }

  const parsed = await parseJsonBody(request, updateFolderSchema)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.message }, { status: 400 })
  }

  const data: { name?: string; parentId?: string | null } = {}

  if (parsed.data.name !== undefined) {
    const name = parsed.data.name
    const existing = await prisma.folder.findFirst({
      where: {
        organizationId: organization.id,
        parentId: folder.parentId,
        deletedAt: null,
        name: { equals: name, mode: "insensitive" },
        NOT: { id: folder.id },
      },
    })
    if (existing) {
      return NextResponse.json({ error: "Un dossier porte déjà ce nom ici." }, { status: 409 })
    }
    data.name = name
  }

  if (parsed.data.parentId !== undefined) {
    const parentId = parsed.data.parentId
    if (parentId) {
      const parent = await prisma.folder.findFirst({
        where: { id: parentId, organizationId: organization.id, deletedAt: null },
      })
      if (!parent) {
        return NextResponse.json({ error: "Dossier de destination introuvable." }, { status: 404 })
      }
      if (await wouldCreateCycle(organization.id, folder.id, parentId)) {
        return NextResponse.json(
          { error: "Impossible de déplacer un dossier dans lui-même ou l'un de ses sous-dossiers." },
          { status: 400 }
        )
      }
    }
    data.parentId = parentId
  }

  const updated = await prisma.folder.update({ where: { id: folder.id }, data })

  return NextResponse.json({ folder: { id: updated.id, name: updated.name, parentId: updated.parentId } })
}

/** Supprime (douce) un dossier et tout son contenu — fondation de la corbeille, voir ITEM-032. */
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

  const folder = await prisma.folder.findFirst({ where: { id, organizationId: organization.id, deletedAt: null } })
  if (!folder) {
    return NextResponse.json({ error: "Dossier introuvable." }, { status: 404 })
  }

  await softDeleteFolderTree(organization.id, folder.id)

  return NextResponse.json({ success: true })
}
