import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getCurrentOrganization } from "@/lib/organization"
import { prisma } from "@/lib/prisma"
import { uploadFile } from "@/lib/storage"
import { generateText } from "@/lib/ai"
import { parseJsonBody } from "@/lib/validation"
import { generateDocumentSchema } from "@/lib/validators/documents"
import { logger } from "@/lib/logger"

const GENERATED_DOCUMENT_MIME_TYPE = "text/plain"
const MAX_TOKENS = 4096

/** Type de document → gabarit de structure/ton injecté dans le prompt système. */
const DOCUMENT_TYPE_GUIDANCE: Record<string, string> = {
  contract: "Un contrat : préambule, articles numérotés (objet, obligations des parties, durée, résiliation), clauses claires et formelles.",
  report: "Un rapport : titre, introduction, sections thématiques avec sous-titres, conclusion — ton factuel et structuré.",
  letter: "Une lettre formelle : formule d'appel, corps structuré en paragraphes, formule de politesse finale.",
  note: "Une note interne : objet en une ligne, puis points clés sous forme de liste à puces — concis et direct.",
  other: "Un document texte structuré, avec des titres et paragraphes adaptés au sujet.",
}

const GENERATE_SYSTEM_PROMPT_PREFIX =
  "Tu rédiges un document complet, prêt à être utilisé comme point de départ, à partir de la description de l'utilisateur. " +
  "Réponds uniquement avec le contenu du document en texte brut (pas de Markdown, pas de commentaire, pas de préambule du type \"Voici votre document\"). " +
  "Type de document attendu : "

/** Génère un nouveau document texte via l'IA et le stocke dans l'espace documents (ITEM-044). */
export async function POST(request: Request) {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 })
  }

  const organization = await getCurrentOrganization()
  if (!organization) {
    return NextResponse.json({ error: "Organisation introuvable." }, { status: 404 })
  }

  const parsed = await parseJsonBody(request, generateDocumentSchema)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.message }, { status: 400 })
  }
  const { name, documentType, description, folderId: folderIdRaw } = parsed.data
  const guidance = DOCUMENT_TYPE_GUIDANCE[documentType]

  let folderId: string | null = null
  if (folderIdRaw) {
    const folder = await prisma.folder.findFirst({
      where: { id: folderIdRaw, organizationId: organization.id, deletedAt: null },
    })
    if (!folder) {
      return NextResponse.json({ error: "Dossier de destination introuvable." }, { status: 404 })
    }
    folderId = folder.id
  }

  let content: string
  try {
    const result = await generateText({
      organizationId: organization.id,
      system: GENERATE_SYSTEM_PROMPT_PREFIX + guidance,
      prompt: description,
      maxTokens: MAX_TOKENS,
    })
    content = result.text
  } catch (err) {
    logger.error("Échec de la génération d'un document IA", err, {
      route: "documents/generate",
      userId: session.user.id,
      organizationId: organization.id,
    })
    const message = err instanceof Error && err.message ? err.message : "Échec de la génération du document."
    return NextResponse.json({ error: message }, { status: 503 })
  }

  const fileName = name.toLowerCase().endsWith(".txt") ? name : `${name}.txt`
  const storageKey = `organizations/${organization.id}/documents/${randomUUID()}.txt`
  const buffer = Buffer.from(content, "utf-8")
  await uploadFile({ key: storageKey, body: buffer, contentType: GENERATED_DOCUMENT_MIME_TYPE })

  const document = await prisma.document.create({
    data: {
      name: fileName,
      size: buffer.byteLength,
      mimeType: GENERATED_DOCUMENT_MIME_TYPE,
      storageKey,
      organizationId: organization.id,
      folderId,
      uploadedById: session.user.id,
    },
  })
  await prisma.documentVersion.create({
    data: {
      documentId: document.id,
      versionNumber: 1,
      size: document.size,
      mimeType: document.mimeType,
      storageKey,
      createdById: session.user.id,
    },
  })

  return NextResponse.json({
    document: { id: document.id, name: document.name, folderId: document.folderId },
  })
}
