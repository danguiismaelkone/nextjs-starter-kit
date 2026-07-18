import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { deleteFile, getSignedUrl, uploadFile } from "@/lib/storage"
import { logger } from "@/lib/logger"

const MAX_LOGO_SIZE = 5 * 1024 * 1024 // 5 Mo — même limite que l'avatar (ITEM-045).
const ACCEPTED_LOGO_TYPES = ["image/jpeg", "image/png", "image/webp"]

function extensionForType(mimeType: string): string {
  return mimeType === "image/png" ? ".png" : mimeType === "image/webp" ? ".webp" : ".jpg"
}

function logoUrl(organizationId: string): string {
  return `/api/organizations/${organizationId}/logo`
}

interface RouteParams {
  params: Promise<{ id: string }>
}

async function requireActiveMembership(userId: string, organizationId: string) {
  return prisma.membership.findFirst({ where: { userId, organizationId, status: "active" } })
}

/**
 * Redirige vers une URL signée temporaire pour le logo de l'organisation —
 * même principe que `GET /api/profile/avatar` (ITEM-045) : `Organization.logo`
 * pointe vers cette route plutôt que directement vers une URL S3, jamais de
 * bucket public. Accessible à tout membre actif (pas seulement owner/admin) :
 * afficher le logo de son organisation n'a pas besoin d'un droit particulier.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 })
  }

  const { id: organizationId } = await params
  const membership = await requireActiveMembership(session.user.id, organizationId)
  if (!membership) {
    return NextResponse.json({ error: "Organisation introuvable." }, { status: 404 })
  }

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { logoStorageKey: true },
  })
  if (!organization?.logoStorageKey) {
    return NextResponse.json({ error: "Aucun logo." }, { status: 404 })
  }

  try {
    const url = await getSignedUrl(organization.logoStorageKey)
    return NextResponse.redirect(url)
  } catch (err) {
    logger.error("Échec de génération de l'URL signée d'un logo d'organisation", err, {
      route: "organizations/logo",
      organizationId,
    })
    return NextResponse.json({ error: "Logo temporairement indisponible." }, { status: 503 })
  }
}

/** Téléverse (ou remplace) le logo de l'organisation — owner/admin uniquement (ITEM-075). */
export async function POST(request: Request, { params }: RouteParams) {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 })
  }

  const { id: organizationId } = await params
  const membership = await requireActiveMembership(session.user.id, organizationId)
  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    return NextResponse.json({ error: "Vous n'avez pas les droits pour modifier cette organisation." }, { status: 403 })
  }

  const formData = await request.formData().catch(() => null)
  const file = formData?.get("file")
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant." }, { status: 400 })
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Fichier vide." }, { status: 400 })
  }
  if (file.size > MAX_LOGO_SIZE) {
    return NextResponse.json(
      { error: `Fichier trop volumineux (max ${MAX_LOGO_SIZE / (1024 * 1024)} Mo).` },
      { status: 413 }
    )
  }
  if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
    return NextResponse.json({ error: `Type de fichier non accepté : ${file.type || "inconnu"}.` }, { status: 415 })
  }

  const previous = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { logoStorageKey: true },
  })

  const storageKey = `organizations/${organizationId}/logo-${randomUUID()}${extensionForType(file.type)}`
  const buffer = Buffer.from(await file.arrayBuffer())

  try {
    await uploadFile({ key: storageKey, body: buffer, contentType: file.type })
  } catch (err) {
    logger.error("Échec de l'envoi d'un logo d'organisation vers le stockage", err, {
      route: "organizations/logo",
      organizationId,
    })
    const message = err instanceof Error && err.message ? err.message : "Échec de l'envoi du logo."
    return NextResponse.json({ error: message }, { status: 503 })
  }

  await prisma.organization.update({
    where: { id: organizationId },
    data: { logoStorageKey: storageKey, logo: logoUrl(organizationId) },
  })

  if (previous?.logoStorageKey) {
    await deleteFile(previous.logoStorageKey).catch((err) => {
      logger.warn("Échec de suppression de l'ancien logo d'organisation", {
        route: "organizations/logo",
        organizationId,
        error: err,
      })
    })
  }

  return NextResponse.json({ logo: logoUrl(organizationId) })
}

/** Retire le logo de l'organisation — owner/admin uniquement (ITEM-075). */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 })
  }

  const { id: organizationId } = await params
  const membership = await requireActiveMembership(session.user.id, organizationId)
  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    return NextResponse.json({ error: "Vous n'avez pas les droits pour modifier cette organisation." }, { status: 403 })
  }

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { logoStorageKey: true },
  })

  await prisma.organization.update({
    where: { id: organizationId },
    data: { logoStorageKey: null, logo: null },
  })

  if (organization?.logoStorageKey) {
    await deleteFile(organization.logoStorageKey).catch((err) => {
      logger.warn("Échec de suppression du logo d'organisation retiré", {
        route: "organizations/logo",
        organizationId,
        error: err,
      })
    })
  }

  return NextResponse.json({ success: true })
}
