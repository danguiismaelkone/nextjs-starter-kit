import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrganizationOwnerId } from "@/lib/billing"

const WINDOW_MS = 60_000

/** Limite appliquée aux organisations sans plan résolu (essai sans plan choisi, ITEM-024). */
const DEFAULT_LIMIT_PER_MINUTE = 60

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  /** Epoch ms auquel la requête la plus ancienne de la fenêtre sort du quota. */
  resetAt: number
}

/**
 * Compteur en mémoire par clé API (fenêtre glissante, ITEM-054) — pas d'infra
 * Redis/cache partagé dans ce starter kit, donc le quota n'est fiable que pour
 * un seul process serveur (ne survit pas à un redémarrage, non partagé entre
 * plusieurs instances). Acceptable pour ce périmètre ; migrer vers un store
 * partagé (Redis) serait nécessaire pour un déploiement multi-instance.
 */
const requestLog = new Map<string, number[]>()

async function resolveLimit(organizationId: string): Promise<number> {
  const ownerId = await getOrganizationOwnerId(organizationId)
  if (!ownerId) return DEFAULT_LIMIT_PER_MINUTE
  const subscription = await prisma.subscription.findUnique({
    where: { ownerId },
    include: { plan: true },
  })
  return subscription?.plan?.rateLimitPerMinute ?? DEFAULT_LIMIT_PER_MINUTE
}

/** Vérifie et enregistre un appel de l'API publique v1 pour cette clé (ITEM-053/054). */
export async function checkRateLimit(organizationId: string, apiKeyId: string): Promise<RateLimitResult> {
  const limit = await resolveLimit(organizationId)
  const now = Date.now()
  const windowStart = now - WINDOW_MS

  const timestamps = (requestLog.get(apiKeyId) ?? []).filter((timestamp) => timestamp > windowStart)

  if (timestamps.length >= limit) {
    requestLog.set(apiKeyId, timestamps)
    return { allowed: false, limit, remaining: 0, resetAt: timestamps[0] + WINDOW_MS }
  }

  timestamps.push(now)
  requestLog.set(apiKeyId, timestamps)

  return { allowed: true, limit, remaining: limit - timestamps.length, resetAt: timestamps[0] + WINDOW_MS }
}

/** Ajoute les en-têtes `X-RateLimit-*` (standard de facto) à une réponse existante. */
export function withRateLimitHeaders(response: NextResponse, result: RateLimitResult): NextResponse {
  response.headers.set("X-RateLimit-Limit", String(result.limit))
  response.headers.set("X-RateLimit-Remaining", String(result.remaining))
  response.headers.set("X-RateLimit-Reset", String(Math.ceil(result.resetAt / 1000)))
  return response
}

/** Réponse `429` explicite (critère ITEM-054), avec `Retry-After` et en-têtes `X-RateLimit-*`. */
export function rateLimitExceededResponse(result: RateLimitResult): NextResponse {
  const retryAfterSeconds = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000))

  const response = NextResponse.json(
    {
      error: {
        code: "rate_limited",
        message: `Limite de ${result.limit} requêtes/minute dépassée. Réessayez dans ${retryAfterSeconds}s.`,
      },
    },
    { status: 429 }
  )
  response.headers.set("Retry-After", String(retryAfterSeconds))

  return withRateLimitHeaders(response, result)
}
