import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getCurrentOrganization } from "@/lib/organization"
import { generateText } from "@/lib/ai"
import { parseJsonBody } from "@/lib/validation"
import { generateTextSchema } from "@/lib/validators/ai"

const GENERATE_SYSTEM_PROMPT =
  "Tu rédiges un brouillon de texte pour l'utilisateur, à partir de son instruction et du contexte éventuel fourni. " +
  "Réponds uniquement avec le texte généré, prêt à être inséré tel quel — sans préambule, sans guillemets, sans commentaire."

const MAX_TOKENS = 1024

/** Point d'entrée générique « Générer avec l'IA » (ITEM-041), réutilisé par `GenerateButton`. */
export async function POST(request: Request) {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 })
  }

  const organization = await getCurrentOrganization()
  if (!organization) {
    return NextResponse.json({ error: "Organisation introuvable." }, { status: 404 })
  }

  const parsed = await parseJsonBody(request, generateTextSchema)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.message }, { status: 400 })
  }
  const { prompt, context } = parsed.data

  const fullPrompt = context ? `Contexte : ${context}\n\nInstruction : ${prompt}` : prompt

  try {
    const result = await generateText({
      organizationId: organization.id,
      system: GENERATE_SYSTEM_PROMPT,
      prompt: fullPrompt,
      maxTokens: MAX_TOKENS,
    })
    return NextResponse.json({ text: result.text })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "IA indisponible." },
      { status: 503 }
    )
  }
}
