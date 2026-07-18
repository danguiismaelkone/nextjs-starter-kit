import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getCurrentOrganization } from "@/lib/organization"
import { prisma } from "@/lib/prisma"
import { contentDisposition, getSignedUrl } from "@/lib/storage"
import { softDeleteDocument } from "@/lib/documents"
import { parseJsonBody } from "@/lib/validation"
import { moveDocumentSchema } from "@/lib/validators/documents"

/**
 * URL signée temporaire (ITEM-027) pour prévisualiser (par défaut) ou
 * télécharger (`?download=1`) un document — jamais d'URL de stockage
 * publique/permanente exposée au client.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
    where: { id, organizationId: organization.id, deletedAt: null },
  })
  if (!document) {
    return NextResponse.json({ error: "Document introuvable." }, { status: 404 })
  }

  const download = new URL(request.url).searchParams.get("download") === "1"
  const url = await getSignedUrl(document.storageKey, {
    responseContentDisposition: contentDisposition(download ? "attachment" : "inline", document.name),
  })

  return NextResponse.json({
    url,
    document: { id: document.id, name: document.name, mimeType: document.mimeType, size: document.size },
  })
}

/** Déplace un document vers un autre dossier (`null` = racine) — glisser-déposer et menu contextuel côté client. */
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

  const document = await prisma.document.findFirst({
    where: { id, organizationId: organization.id, deletedAt: null },
  })
  if (!document) {
    return NextResponse.json({ error: "Document introuvable." }, { status: 404 })
  }

  const parsed = await parseJsonBody(request, moveDocumentSchema)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.message }, { status: 400 })
  }
  const { folderId } = parsed.data

  if (folderId) {
    const folder = await prisma.folder.findFirst({
      where: { id: folderId, organizationId: organization.id, deletedAt: null },
    })
    if (!folder) {
      return NextResponse.json({ error: "Dossier de destination introuvable." }, { status: 404 })
    }
  }

  const updated = await prisma.document.update({ where: { id: document.id }, data: { folderId } })

  return NextResponse.json({ document: { id: updated.id, folderId: updated.folderId } })
}

/**
 * Supprime (douce) un document isolé — envoi vers la corbeille (ITEM-032),
 * jamais de suppression immédiate du stockage.
 */
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

  const document = await prisma.document.findFirst({
    where: { id, organizationId: organization.id, deletedAt: null },
  })
  if (!document) {
    return NextResponse.json({ error: "Document introuvable." }, { status: 404 })
  }

  await softDeleteDocument(organization.id, document.id)

  return NextResponse.json({ success: true })
}
