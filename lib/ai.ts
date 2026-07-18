import Anthropic from "@anthropic-ai/sdk"
import { prisma } from "@/lib/prisma"

const DEFAULT_MODEL = "claude-opus-4-8"
const DEFAULT_TIMEOUT_MS = 60_000
const DEFAULT_MAX_TOKENS = 1024

let cachedClient: Anthropic | null | undefined

/**
 * Client Anthropic paresseux, configuré par variable d'environnement — même
 * approche que `getStripeClient()` (lib/stripe.ts) : construit au premier
 * appel, `null` si `ANTHROPIC_API_KEY` n'est pas configurée (mode dev).
 * `timeout` couvre le critère d'acceptation "gestion des timeouts" — le SDK
 * lève une erreur typée au-delà de ce délai plutôt que de bloquer indéfiniment.
 */
function getAnthropicClient(): Anthropic | null {
  if (cachedClient !== undefined) return cachedClient

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    cachedClient = null
    return null
  }

  const timeout = Number(process.env.AI_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS
  cachedClient = new Anthropic({ apiKey, timeout })
  return cachedClient
}

/**
 * Prix indicatifs (USD par million de tokens, cache 2026-06-24) — à tenir à
 * jour manuellement depuis https://platform.claude.com/docs/en/pricing.
 * Sert uniquement à estimer `AiUsageLog.estimatedCostCents` (suivi de
 * consommation, ITEM-039) : jamais une source de vérité pour la facturation
 * réelle, qui reste celle du relevé Anthropic.
 */
const MODEL_PRICING_USD_PER_MILLION_TOKENS: Record<string, { input: number; output: number }> = {
  "claude-opus-4-8": { input: 5, output: 25 },
  "claude-sonnet-5": { input: 3, output: 15 },
  "claude-haiku-4-5": { input: 1, output: 5 },
}

function estimateCostCents(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING_USD_PER_MILLION_TOKENS[model]
  if (!pricing) return 0
  const dollars = (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000
  return Math.round(dollars * 100)
}

/**
 * Écrit une ligne `AiUsageLog` et retourne le résumé de consommation —
 * partagé par `generateText` et `streamChat` (ITEM-040) pour ne journaliser
 * qu'à un seul endroit.
 */
async function logAiUsage(
  organizationId: string,
  model: string,
  inputTokens: number,
  outputTokens: number
): Promise<GenerateTextUsage> {
  const estimatedCostCents = estimateCostCents(model, inputTokens, outputTokens)
  await prisma.aiUsageLog.create({
    data: { organizationId, model, inputTokens, outputTokens, estimatedCostCents },
  })
  return { inputTokens, outputTokens, estimatedCostCents }
}

export interface GenerateTextInput {
  /** Organisation à qui imputer la consommation (journalisée dans `AiUsageLog`). */
  organizationId: string
  /**
   * Prompt système — jamais transmis au client (cette fonction ne s'exécute
   * que côté serveur), couvre le critère d'acceptation correspondant.
   */
  system?: string
  prompt: string
  maxTokens?: number
}

export interface GenerateTextUsage {
  inputTokens: number
  outputTokens: number
  estimatedCostCents: number
}

export interface GenerateTextResult {
  text: string
  usage: GenerateTextUsage
}

/**
 * Point d'entrée générique pour un appel IA texte (ITEM-039) — fondation
 * réutilisée par les futures fonctionnalités (chat ITEM-040, génération de
 * contenu ITEM-041, etc.). Journalise systématiquement la consommation par
 * organisation avant de retourner le résultat.
 */
export async function generateText({
  organizationId,
  system,
  prompt,
  maxTokens = DEFAULT_MAX_TOKENS,
}: GenerateTextInput): Promise<GenerateTextResult> {
  const client = getAnthropicClient()
  if (!client) {
    throw new Error("IA non configurée : la variable d'environnement ANTHROPIC_API_KEY est requise.")
  }

  const model = process.env.AI_MODEL || DEFAULT_MODEL

  let response: Anthropic.Message
  try {
    response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: prompt }],
    })
  } catch (err) {
    if (err instanceof Anthropic.APIConnectionTimeoutError) {
      throw new Error("IA : délai d'attente dépassé.")
    }
    if (err instanceof Anthropic.APIError) {
      throw new Error(`IA : échec de la requête (${err.status ?? "réseau"}) — ${err.message}`)
    }
    throw err
  }

  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text"
  )

  const usage = await logAiUsage(organizationId, model, response.usage.input_tokens, response.usage.output_tokens)

  return { text: textBlock?.text ?? "", usage }
}

export interface ChatTurn {
  role: "user" | "assistant"
  content: string
}

export interface StreamChatInput {
  messages: ChatTurn[]
  system?: string
  maxTokens?: number
}

export interface StreamChatHandle {
  /** Flux Anthropic brut — l'appelant l'itère (ou utilise `.on("text", ...)`) puis appelle `finalMessage()`. */
  stream: ReturnType<Anthropic["messages"]["stream"]>
  model: string
}

/**
 * Variante streamée de `generateText`, pour l'affichage progressif (ITEM-040
 * — historique de chat). Ne journalise pas elle-même la consommation : une
 * fois le flux terminé, l'appelant doit lire `stream.finalMessage().usage`
 * et appeler `logChatUsage()` ci-dessous (la réponse n'est connue qu'à la
 * fin du flux, donc la journalisation ne peut pas se faire à l'intérieur de
 * cette fonction sans bloquer sur tout le flux — ce qui annulerait le
 * streaming).
 */
export function streamChat({ messages, system, maxTokens = DEFAULT_MAX_TOKENS }: StreamChatInput): StreamChatHandle {
  const client = getAnthropicClient()
  if (!client) {
    throw new Error("IA non configurée : la variable d'environnement ANTHROPIC_API_KEY est requise.")
  }

  const model = process.env.AI_MODEL || DEFAULT_MODEL

  const stream = client.messages.stream({
    model,
    max_tokens: maxTokens,
    system,
    messages: messages.map((turn) => ({ role: turn.role, content: turn.content })),
  })

  return { stream, model }
}

/** Journalise la consommation d'un appel `streamChat` une fois le flux terminé. */
export function logChatUsage(
  organizationId: string,
  model: string,
  inputTokens: number,
  outputTokens: number
): Promise<GenerateTextUsage> {
  return logAiUsage(organizationId, model, inputTokens, outputTokens)
}

const OCR_SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const
const OCR_SUPPORTED_PDF_TYPE = "application/pdf"

/** Types de fichiers pris en charge par `extractDocumentText` (ITEM-042). */
export const OCR_SUPPORTED_MIME_TYPES: readonly string[] = [...OCR_SUPPORTED_IMAGE_TYPES, OCR_SUPPORTED_PDF_TYPE]

const OCR_SYSTEM_PROMPT =
  "Tu extrais fidèlement tout le texte visible dans le document ou l'image fourni, dans l'ordre de lecture naturel. " +
  'Réponds uniquement avec le texte extrait, sans commentaire ni mise en forme ajoutée. Si aucun texte n\'est visible, réponds exactement "Aucun texte détecté."'

const DEFAULT_OCR_MAX_TOKENS = 4096

export interface ExtractDocumentTextInput {
  organizationId: string
  /** Doit figurer dans `OCR_SUPPORTED_MIME_TYPES` — vérifié en amont par l'appelant. */
  mimeType: string
  /** Contenu du fichier encodé en base64. */
  base64Data: string
  maxTokens?: number
}

/**
 * OCR via la capacité vision de Claude (ITEM-042) : image ou PDF en entrée,
 * texte extrait en sortie. Réutilise le même client/`logAiUsage` que
 * `generateText`/`streamChat` — seule la construction du bloc de contenu
 * (image vs document) diffère d'un appel texte classique.
 */
export async function extractDocumentText({
  organizationId,
  mimeType,
  base64Data,
  maxTokens = DEFAULT_OCR_MAX_TOKENS,
}: ExtractDocumentTextInput): Promise<GenerateTextResult> {
  const client = getAnthropicClient()
  if (!client) {
    throw new Error("IA non configurée : la variable d'environnement ANTHROPIC_API_KEY est requise.")
  }
  if (!OCR_SUPPORTED_MIME_TYPES.includes(mimeType)) {
    throw new Error(`Format non supporté pour l'extraction de texte : ${mimeType}.`)
  }

  const model = process.env.AI_MODEL || DEFAULT_MODEL

  const fileBlock: Anthropic.ContentBlockParam =
    mimeType === OCR_SUPPORTED_PDF_TYPE
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64Data } }
      : {
          type: "image",
          source: {
            type: "base64",
            media_type: mimeType as (typeof OCR_SUPPORTED_IMAGE_TYPES)[number],
            data: base64Data,
          },
        }

  let response: Anthropic.Message
  try {
    response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system: OCR_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [fileBlock, { type: "text", text: "Extrait tout le texte de ce document." }],
        },
      ],
    })
  } catch (err) {
    if (err instanceof Anthropic.APIConnectionTimeoutError) {
      throw new Error("IA : délai d'attente dépassé.")
    }
    if (err instanceof Anthropic.APIError) {
      throw new Error(`IA : échec de la requête (${err.status ?? "réseau"}) — ${err.message}`)
    }
    throw err
  }

  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text"
  )

  const usage = await logAiUsage(organizationId, model, response.usage.input_tokens, response.usage.output_tokens)

  return { text: textBlock?.text ?? "", usage }
}

/**
 * Types pris en charge par `summarizeDocument` (ITEM-043) — volontairement
 * limité au PDF : c'est le seul type "document texte" réellement uploadable
 * dans ce repo (`ACCEPTED_UPLOAD_TYPES` dans `app/api/documents/upload/route.ts`
 * n'accepte sinon que des images, hors périmètre du critère d'acceptation
 * « document texte/PDF »).
 */
export const SUMMARIZE_SUPPORTED_MIME_TYPES: readonly string[] = ["application/pdf"]

const SUMMARIZE_SYSTEM_PROMPT =
  "Tu résumes fidèlement le document fourni pour un lecteur pressé. Réponds avec un résumé structuré en Markdown : " +
  "une ou deux phrases d'ensemble, puis une liste à puces (\"-\") des points clés. " +
  "Reste factuel, n'invente rien qui ne soit pas dans le document, et ne commente pas ta propre réponse."

const DEFAULT_SUMMARIZE_MAX_TOKENS = 2048

export interface SummarizeDocumentInput {
  organizationId: string
  /** Doit figurer dans `SUMMARIZE_SUPPORTED_MIME_TYPES` — vérifié en amont par l'appelant. */
  mimeType: string
  /** Contenu du fichier encodé en base64. */
  base64Data: string
  maxTokens?: number
}

/**
 * Résumé structuré d'un document PDF (ITEM-043), via la même capacité de
 * lecture de document que `extractDocumentText` (ITEM-042) — seul le prompt
 * système diffère (résumé structuré plutôt que transcription intégrale).
 */
export async function summarizeDocument({
  organizationId,
  mimeType,
  base64Data,
  maxTokens = DEFAULT_SUMMARIZE_MAX_TOKENS,
}: SummarizeDocumentInput): Promise<GenerateTextResult> {
  const client = getAnthropicClient()
  if (!client) {
    throw new Error("IA non configurée : la variable d'environnement ANTHROPIC_API_KEY est requise.")
  }
  if (!SUMMARIZE_SUPPORTED_MIME_TYPES.includes(mimeType)) {
    throw new Error(`Format non supporté pour le résumé : ${mimeType}.`)
  }

  const model = process.env.AI_MODEL || DEFAULT_MODEL

  let response: Anthropic.Message
  try {
    response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system: SUMMARIZE_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64Data } },
            { type: "text", text: "Résume ce document." },
          ],
        },
      ],
    })
  } catch (err) {
    if (err instanceof Anthropic.APIConnectionTimeoutError) {
      throw new Error("IA : délai d'attente dépassé.")
    }
    if (err instanceof Anthropic.APIError) {
      throw new Error(`IA : échec de la requête (${err.status ?? "réseau"}) — ${err.message}`)
    }
    throw err
  }

  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text"
  )

  const usage = await logAiUsage(organizationId, model, response.usage.input_tokens, response.usage.output_tokens)

  return { text: textBlock?.text ?? "", usage }
}
