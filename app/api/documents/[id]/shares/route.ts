import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getCurrentOrganization } from "@/lib/organization"
import { prisma } from "@/lib/prisma"
import { generateShareToken, isShareActive } from "@/lib/shares"
import { parseJsonBody } from "@/lib/validation"
import { createShareSchema } from "@/lib/validators/documents"

async function resolveOwnedDocument(organizationId: string, documentId: string) {
  return prisma.document.findFirst({ where: { id: documentId, organizationId, deletedAt: null } })
}

/** Liste les liens de partage d'un document, du plus récent au plus ancien. */
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

  const document = await resolveOwnedDocument(organization.id, id)
  if (!document) {
    return NextResponse.json({ error: "Document introuvable." }, { status: 404 })
  }

  const shares = await prisma.documentShare.findMany({
    where: { documentId: document.id },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({
    shares: shares.map((share) => ({
      id: share.id,
      token: share.token,
      accessLevel: share.accessLevel,
      visibility: share.visibility,
      expiresAt: share.expiresAt,
      revokedAt: share.revokedAt,
      createdAt: share.createdAt,
      isActive: isShareActive(share),
    })),
  })
}

/** Génère un nouveau lien de partage pour un document. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 })
  }

  // Tout membre actif de l'organisation peut partager — pas réservé aux admins,
  // cohérent avec l'upload (ITEM-028) et la gestion de dossiers (ITEM-029).
  const organization = await getCurrentOrganization()
  if (!organization) {
    return NextResponse.json({ error: "Organisation introuvable." }, { status: 404 })
  }

  const document = await resolveOwnedDocument(organization.id, id)
  if (!document) {
    return NextResponse.json({ error: "Document introuvable." }, { status: 404 })
  }

  const parsed = await parseJsonBody(request, createShareSchema)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.message }, { status: 400 })
  }
  const { accessLevel, visibility, expiresInDays } = parsed.data

  const expiresAt =
    expiresInDays !== null && expiresInDays !== undefined ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) : null

  const share = await prisma.documentShare.create({
    data: {
      documentId: document.id,
      token: generateShareToken(),
      accessLevel,
      visibility,
      expiresAt,
      createdById: session.user.id,
    },
  })

  return NextResponse.json({
    share: {
      id: share.id,
      token: share.token,
      accessLevel: share.accessLevel,
      visibility: share.visibility,
      expiresAt: share.expiresAt,
      revokedAt: share.revokedAt,
      createdAt: share.createdAt,
      isActive: true,
    },
  })
}
