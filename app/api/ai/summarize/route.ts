import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getCurrentOrganization } from "@/lib/organization"
import { prisma } from "@/lib/prisma"
import { getFileBuffer } from "@/lib/storage"
import { summarizeDocument, SUMMARIZE_SUPPORTED_MIME_TYPES } from "@/lib/ai"
import { parseJsonBody, parseSearchParams } from "@/lib/validation"
import { documentIdSchema } from "@/lib/validators/ai"
import { logger } from "@/lib/logger"

// Même plafond que l'OCR (ITEM-042) — bien en-deçà des limites Anthropic
// (32 Mo/requête, PDF 600 pages), pour ne pas charger un fichier volumineux
// entièrement en mémoire côté serveur (`getFileBuffer`).
const MAX_SUMMARIZE_FILE_SIZE_BYTES = 20 * 1024 * 1024

async function resolveOwnedDocument(organizationId: string, documentId: string) {
  return prisma.document.findFirst({ where: { id: documentId, organizationId, deletedAt: null } })
}

/** Résumé déjà en cache pour ce document (ITEM-043) — `summary: null` si jamais généré. */
export async function GET(request: Request) {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 })
  }

  const organization = await getCurrentOrganization()
  if (!organization) {
    return NextResponse.json({ error: "Organisation introuvable." }, { status: 404 })
  }

  const parsed = parseSearchParams(request.url, documentIdSchema)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.message }, { status: 400 })
  }
  const { documentId } = parsed.data

  const document = await resolveOwnedDocument(organization.id, documentId)
  if (!document) {
    return NextResponse.json({ error: "Document introuvable." }, { status: 404 })
  }

  return NextResponse.json({ summary: document.summary, summaryUpdatedAt: document.summaryUpdatedAt })
}

/** (Re)génère le résumé d'un document PDF et le met en cache (ITEM-043). */
export async function POST(request: Request) {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 })
  }

  const organization = await getCurrentOrganization()
  if (!organization) {
    return NextResponse.json({ error: "Organisation introuvable." }, { status: 404 })
  }

  const parsed = await parseJsonBody(request, documentIdSchema)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.message }, { status: 400 })
  }
  const { documentId } = parsed.data

  const document = await resolveOwnedDocument(organization.id, documentId)
  if (!document) {
    return NextResponse.json({ error: "Document introuvable." }, { status: 404 })
  }

  // Message explicite plutôt qu'une erreur technique, vérifié avant tout appel IA.
  if (!SUMMARIZE_SUPPORTED_MIME_TYPES.includes(document.mimeType)) {
    return NextResponse.json(
      { error: "Ce type de fichier n'est pas pris en charge pour le résumé. Seuls les documents PDF le sont." },
      { status: 422 }
    )
  }
  if (document.size > MAX_SUMMARIZE_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: "Ce fichier est trop volumineux pour être résumé (maximum 20 Mo)." },
      { status: 422 }
    )
  }

  try {
    const buffer = await getFileBuffer(document.storageKey)
    const result = await summarizeDocument({
      organizationId: organization.id,
      mimeType: document.mimeType,
      base64Data: buffer.toString("base64"),
    })

    const summaryUpdatedAt = new Date()
    await prisma.document.update({
      where: { id: document.id },
      data: { summary: result.text, summaryUpdatedAt },
    })

    return NextResponse.json({ summary: result.text, summaryUpdatedAt })
  } catch (err) {
    logger.error("Échec du résumé pour un document", err, {
      route: "ai/summarize",
      userId: session.user.id,
      organizationId: organization.id,
      documentId: document.id,
    })
    const message = err instanceof Error && err.message ? err.message : "Échec de la génération du résumé."
    return NextResponse.json({ error: message }, { status: 503 })
  }
}
