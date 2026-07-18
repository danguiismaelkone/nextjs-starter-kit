import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getCurrentOrganization } from "@/lib/organization"
import { prisma } from "@/lib/prisma"
import { getFolderPath } from "@/lib/documents"
import { parseSearchParams } from "@/lib/validation"
import { searchDocumentsQuerySchema } from "@/lib/validators/documents"

const MAX_RESULTS = 50

/**
 * Recherche de documents par nom (V1 — `contains` Prisma, pas d'indexation
 * full-text). Plein texte dans le contenu des fichiers : hors périmètre
 * (ITEM-034), voir ITEM-042 (OCR/extraction).
 */
export async function GET(request: Request) {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 })
  }

  const organization = await getCurrentOrganization()
  if (!organization) {
    return NextResponse.json({ error: "Organisation introuvable." }, { status: 404 })
  }

  const parsed = parseSearchParams(request.url, searchDocumentsQuerySchema)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.message }, { status: 400 })
  }
  const query = parsed.data.q
  if (!query) {
    return NextResponse.json({ results: [] })
  }

  const documents = await prisma.document.findMany({
    where: { organizationId: organization.id, deletedAt: null, name: { contains: query, mode: "insensitive" } },
    orderBy: { name: "asc" },
    take: MAX_RESULTS,
  })

  // Un seul calcul de chemin par dossier distinct, même si plusieurs résultats
  // partagent le même dossier parent.
  const folderPaths = new Map<string, Awaited<ReturnType<typeof getFolderPath>>>()
  for (const folderId of new Set(documents.map((document) => document.folderId).filter((id) => id !== null))) {
    folderPaths.set(folderId, await getFolderPath(organization.id, folderId))
  }

  return NextResponse.json({
    results: documents.map((document) => ({
      id: document.id,
      name: document.name,
      size: document.size,
      mimeType: document.mimeType,
      folderId: document.folderId,
      folderPath: document.folderId ? (folderPaths.get(document.folderId) ?? []) : [],
    })),
  })
}
