import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { logger } from "@/lib/logger"
import { parseJsonBody } from "@/lib/validation"
import { clientErrorSchema } from "@/lib/validators/client-error"

/**
 * Reçoit les erreurs de rendu React non rattrapées côté client
 * (`app/global-error.tsx`, ITEM-062) et les relaie au logger structuré / au
 * service de tracking serveur. Accessible sans session : une erreur peut
 * survenir sur une page publique (ex. `/login`) — best-effort, ne renvoie
 * jamais d'erreur bloquante au client qui vient déjà de planter.
 */
export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, clientErrorSchema)
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 200 })
  }

  const session = await getSession()
  const { message, stack, digest } = parsed.data

  logger.error("Erreur de rendu client non rattrapée", { message, stack }, {
    userId: session?.user?.id,
    route: "client-render",
    digest,
  })

  return NextResponse.json({ ok: true })
}
