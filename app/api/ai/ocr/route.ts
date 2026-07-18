import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getCurrentOrganization } from "@/lib/organization"
import { prisma } from "@/lib/prisma"
import { getFileBuffer } from "@/lib/storage"
import { extractDocumentText, OCR_SUPPORTED_MIME_TYPES } from "@/lib/ai"
import { parseJsonBody } from "@/lib/validation"
import { documentIdSchema } from "@/lib/validators/ai"
import { logger } from "@/lib/logger"

// Limite volontairement bien en-deçà des plafonds Anthropic (32 Mo/requête,
// PDF 600 pages) : évite de charger un fichier volumineux entièrement en
// mémoire côté serveur (`getFileBuffer`) pour un usage OCR ponctuel.
const MAX_OCR_FILE_SIZE_BYTES = 20 * 1024 * 1024

/** Lance l'extraction de texte (OCR, ITEM-042) sur un document image/PDF et la persiste. */
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

  const document = await prisma.document.findFirst({
    where: { id: documentId, organizationId: organization.id, deletedAt: null },
  })
  if (!document) {
    return NextResponse.json({ error: "Document introuvable." }, { status: 404 })
  }

  // Message explicite plutôt qu'une erreur technique (critère d'acceptation) :
  // vérifié avant tout appel IA, pour les formats et les fichiers trop volumineux.
  if (!OCR_SUPPORTED_MIME_TYPES.includes(document.mimeType)) {
    return NextResponse.json(
      {
        error:
          "Ce type de fichier n'est pas pris en charge pour l'extraction de texte. " +
          "Formats supportés : images (JPEG, PNG, GIF, WebP) et PDF.",
      },
      { status: 422 }
    )
  }
  if (document.size > MAX_OCR_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: "Ce fichier est trop volumineux pour l'extraction de texte (maximum 20 Mo)." },
      { status: 422 }
    )
  }

  try {
    const buffer = await getFileBuffer(document.storageKey)
    const result = await extractDocumentText({
      organizationId: organization.id,
      mimeType: document.mimeType,
      base64Data: buffer.toString("base64"),
    })

    await prisma.document.update({
      where: { id: document.id },
      data: { ocrText: result.text, ocrProcessedAt: new Date() },
    })

    return NextResponse.json({ text: result.text })
  } catch (err) {
    logger.error("Échec de l'extraction OCR pour un document", err, {
      route: "ai/ocr",
      userId: session.user.id,
      organizationId: organization.id,
      documentId: document.id,
    })
    // `err.message` peut être vide (ex. `AggregateError` réseau de l'SDK S3) —
    // toujours retourner un message explicite plutôt qu'une chaîne vide.
    const message = err instanceof Error && err.message ? err.message : "Échec de l'extraction de texte."
    return NextResponse.json({ error: message }, { status: 503 })
  }
}
