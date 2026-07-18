import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getCurrentOrganization } from "@/lib/organization"
import { prisma } from "@/lib/prisma"
import { parseJsonBody } from "@/lib/validation"
import { createFolderSchema } from "@/lib/validators/folders"

/** Crée un dossier dans l'organisation active (racine si `parentId` absent). */
export async function POST(request: Request) {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 })
  }

  // Tout membre actif de l'organisation peut organiser les documents.
  const organization = await getCurrentOrganization()
  if (!organization) {
    return NextResponse.json({ error: "Organisation introuvable." }, { status: 404 })
  }

  const parsed = await parseJsonBody(request, createFolderSchema)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.message }, { status: 400 })
  }
  const { name } = parsed.data
  const parentId = parsed.data.parentId ?? null

  if (parentId) {
    const parent = await prisma.folder.findFirst({
      where: { id: parentId, organizationId: organization.id, deletedAt: null },
    })
    if (!parent) {
      return NextResponse.json({ error: "Dossier parent introuvable." }, { status: 404 })
    }
  }

  const existing = await prisma.folder.findFirst({
    where: {
      organizationId: organization.id,
      parentId,
      deletedAt: null,
      name: { equals: name, mode: "insensitive" },
    },
  })
  if (existing) {
    return NextResponse.json({ error: "Un dossier porte déjà ce nom ici." }, { status: 409 })
  }

  const folder = await prisma.folder.create({
    data: { name, parentId, organizationId: organization.id },
  })

  return NextResponse.json({ folder: { id: folder.id, name: folder.name, parentId: folder.parentId } })
}
