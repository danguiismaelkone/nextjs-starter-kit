import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getCurrentOrganization } from "@/lib/organization"
import { prisma } from "@/lib/prisma"
import { uploadFile } from "@/lib/storage"
import { nullableFolderIdValue } from "@/lib/validators/documents"

export const MAX_UPLOAD_SIZE = 20 * 1024 * 1024 // 20 Mo
export const ACCEPTED_UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"]

/** Extension sûre (lettres/chiffres uniquement) — jamais le nom de fichier fourni tel quel dans la clé de stockage. */
function safeExtension(filename: string): string {
  const match = /\.[a-zA-Z0-9]{1,10}$/.exec(filename)
  return match ? match[0] : ""
}

/**
 * Upload un fichier dans le dossier courant de l'organisation active.
 * Route Handler (et non Server Action) pour permettre une vraie barre de
 * progression côté client via `XMLHttpRequest` (`hooks/use-upload.ts`).
 */
export async function POST(request: Request) {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 })
  }

  // Tout membre actif de l'organisation peut uploader — pas réservé aux admins.
  const organization = await getCurrentOrganization()
  if (!organization) {
    return NextResponse.json({ error: "Organisation introuvable." }, { status: 404 })
  }

  const formData = await request.formData().catch(() => null)
  const file = formData?.get("file")
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant." }, { status: 400 })
  }

  // Validation serveur — jamais de confiance dans la seule validation client.
  if (file.size === 0) {
    return NextResponse.json({ error: "Fichier vide." }, { status: 400 })
  }
  if (file.size > MAX_UPLOAD_SIZE) {
    return NextResponse.json(
      { error: `Fichier trop volumineux (max ${MAX_UPLOAD_SIZE / (1024 * 1024)} Mo).` },
      { status: 413 }
    )
  }
  if (!ACCEPTED_UPLOAD_TYPES.includes(file.type)) {
    return NextResponse.json({ error: `Type de fichier non accepté : ${file.type || "inconnu"}.` }, { status: 415 })
  }

  const folderIdParsed = nullableFolderIdValue.safeParse(formData?.get("folderId") ?? null)
  if (!folderIdParsed.success) {
    return NextResponse.json({ error: "Dossier de destination invalide." }, { status: 400 })
  }
  const folderId = folderIdParsed.data
  if (folderId) {
    const folder = await prisma.folder.findFirst({
      where: { id: folderId, organizationId: organization.id, deletedAt: null },
    })
    if (!folder) {
      return NextResponse.json({ error: "Dossier introuvable." }, { status: 404 })
    }
  }

  const storageKey = `organizations/${organization.id}/documents/${randomUUID()}${safeExtension(file.name)}`
  const buffer = Buffer.from(await file.arrayBuffer())
  await uploadFile({ key: storageKey, body: buffer, contentType: file.type })

  // Même nom (insensible à la casse) dans le même dossier → nouvelle version
  // (ITEM-031) plutôt qu'un écrasement : l'ancien fichier reste accessible via
  // `DocumentVersion`, jamais supprimé du stockage ici.
  const existing = await prisma.document.findFirst({
    where: { organizationId: organization.id, folderId, deletedAt: null, name: { equals: file.name, mode: "insensitive" } },
  })

  let document: { id: string; name: string; size: number; mimeType: string; createdAt: Date }

  if (existing) {
    const lastVersion = await prisma.documentVersion.findFirst({
      where: { documentId: existing.id },
      orderBy: { versionNumber: "desc" },
    })
    const versionNumber = (lastVersion?.versionNumber ?? 0) + 1

    const [, updated] = await prisma.$transaction([
      prisma.documentVersion.create({
        data: {
          documentId: existing.id,
          versionNumber,
          size: file.size,
          mimeType: file.type,
          storageKey,
          createdById: session.user.id,
        },
      }),
      prisma.document.update({
        where: { id: existing.id },
        data: { size: file.size, mimeType: file.type, storageKey, uploadedById: session.user.id },
      }),
    ])
    document = updated
  } else {
    const created = await prisma.document.create({
      data: {
        name: file.name,
        size: file.size,
        mimeType: file.type,
        storageKey,
        organizationId: organization.id,
        folderId,
        uploadedById: session.user.id,
      },
    })
    await prisma.documentVersion.create({
      data: {
        documentId: created.id,
        versionNumber: 1,
        size: file.size,
        mimeType: file.type,
        storageKey,
        createdById: session.user.id,
      },
    })
    document = created
  }

  return NextResponse.json({
    document: {
      id: document.id,
      name: document.name,
      size: document.size,
      mimeType: document.mimeType,
      createdAt: document.createdAt,
    },
  })
}
