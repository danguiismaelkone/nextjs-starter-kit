import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { deleteFile, getSignedUrl, uploadFile } from "@/lib/storage"
import { logger } from "@/lib/logger"

const MAX_AVATAR_SIZE = 5 * 1024 * 1024 // 5 Mo
const ACCEPTED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"]
const AVATAR_URL = "/api/profile/avatar"

function extensionForType(mimeType: string): string {
  return mimeType === "image/png" ? ".png" : mimeType === "image/webp" ? ".webp" : ".jpg"
}

/**
 * Redirige vers une URL signée temporaire pour l'avatar de l'utilisateur
 * connecté — `User.image` pointe vers cette route plutôt que directement vers
 * une URL S3, jamais de bucket public (même principe que les documents,
 * ITEM-027).
 */
export async function GET() {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { avatarStorageKey: true },
  })
  if (!user?.avatarStorageKey) {
    return NextResponse.json({ error: "Aucun avatar." }, { status: 404 })
  }

  try {
    const url = await getSignedUrl(user.avatarStorageKey)
    return NextResponse.redirect(url)
  } catch (err) {
    logger.error("Échec de génération de l'URL signée d'un avatar", err, { route: "profile/avatar", userId: session.user.id })
    return NextResponse.json({ error: "Avatar temporairement indisponible." }, { status: 503 })
  }
}

/** Upload (ou remplace) l'avatar de l'utilisateur connecté (ITEM-045). */
export async function POST(request: Request) {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 })
  }

  const formData = await request.formData().catch(() => null)
  const file = formData?.get("file")
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant." }, { status: 400 })
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Fichier vide." }, { status: 400 })
  }
  if (file.size > MAX_AVATAR_SIZE) {
    return NextResponse.json(
      { error: `Fichier trop volumineux (max ${MAX_AVATAR_SIZE / (1024 * 1024)} Mo).` },
      { status: 413 }
    )
  }
  if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) {
    return NextResponse.json({ error: `Type de fichier non accepté : ${file.type || "inconnu"}.` }, { status: 415 })
  }

  const previous = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { avatarStorageKey: true },
  })

  const storageKey = `users/${session.user.id}/avatar-${randomUUID()}${extensionForType(file.type)}`
  const buffer = Buffer.from(await file.arrayBuffer())

  try {
    await uploadFile({ key: storageKey, body: buffer, contentType: file.type })
  } catch (err) {
    logger.error("Échec de l'envoi d'un avatar vers le stockage", err, { route: "profile/avatar", userId: session.user.id })
    const message = err instanceof Error && err.message ? err.message : "Échec de l'envoi de l'avatar."
    return NextResponse.json({ error: message }, { status: 503 })
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { avatarStorageKey: storageKey, image: AVATAR_URL },
  })

  if (previous?.avatarStorageKey) {
    await deleteFile(previous.avatarStorageKey).catch((err) => {
      logger.warn("Échec de suppression de l'ancien avatar", { route: "profile/avatar", userId: session.user.id, error: err })
    })
  }

  return NextResponse.json({ image: AVATAR_URL })
}
