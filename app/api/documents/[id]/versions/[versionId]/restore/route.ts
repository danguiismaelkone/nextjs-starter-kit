import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getCurrentOrganization } from "@/lib/organization"
import { prisma } from "@/lib/prisma"

/**
 * Restaure une version antérieure : repointe le document (`size`/`mimeType`/
 * `storageKey`) vers cette version, sans dupliquer de ligne `DocumentVersion`
 * ni toucher au stockage — l'ancien fichier "actuel" reste dans l'historique
 * (déjà versionné lors de son propre upload).
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string; versionId: string }> }) {
  const { id, versionId } = await params
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

  const version = await prisma.documentVersion.findFirst({
    where: { id: versionId, documentId: document.id },
  })
  if (!version) {
    return NextResponse.json({ error: "Version introuvable." }, { status: 404 })
  }

  if (version.storageKey === document.storageKey) {
    return NextResponse.json({ error: "Cette version est déjà la version actuelle." }, { status: 400 })
  }

  const updated = await prisma.document.update({
    where: { id: document.id },
    data: { size: version.size, mimeType: version.mimeType, storageKey: version.storageKey },
  })

  return NextResponse.json({
    document: { id: updated.id, size: updated.size, mimeType: updated.mimeType },
  })
}
