import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getCurrentOrganization } from "@/lib/organization"
import { prisma } from "@/lib/prisma"

/** Historique des versions d'un document (ITEM-031), de la plus récente à la plus ancienne. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const versions = await prisma.documentVersion.findMany({
    where: { documentId: document.id },
    orderBy: { versionNumber: "desc" },
    include: { createdBy: { select: { name: true } } },
  })

  return NextResponse.json({
    versions: versions.map((version) => ({
      id: version.id,
      versionNumber: version.versionNumber,
      size: version.size,
      mimeType: version.mimeType,
      createdAt: version.createdAt,
      createdByName: version.createdBy?.name ?? null,
      // La version dont la clé de stockage correspond au document = version actuelle
      // (une restauration repointe le document sans dupliquer de ligne, voir la route
      // de restauration).
      isCurrent: version.storageKey === document.storageKey,
    })),
  })
}
