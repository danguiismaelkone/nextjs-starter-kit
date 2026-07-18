import { requireApiKeyAuth } from "@/lib/api-auth"
import { apiError, apiSuccess } from "@/lib/api-response"
import { checkRateLimit, rateLimitExceededResponse, withRateLimitHeaders } from "@/lib/rate-limit"
import { prisma } from "@/lib/prisma"

/** Membre de l'organisation propriétaire de la clé API, par id utilisateur (ITEM-053). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiKeyAuth(request)
  if (!auth.ok) return apiError(auth.status, auth.code, auth.message)

  const rateLimit = await checkRateLimit(auth.organizationId, auth.apiKeyId)
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit)

  const { id } = await params

  const membership = await prisma.membership.findFirst({
    where: { organizationId: auth.organizationId, status: "active", userId: id },
    include: { user: { select: { id: true, name: true, email: true, image: true, createdAt: true } } },
  })
  if (!membership) {
    return withRateLimitHeaders(apiError(404, "not_found", "Utilisateur introuvable."), rateLimit)
  }

  return withRateLimitHeaders(
    apiSuccess({
      id: membership.user.id,
      name: membership.user.name,
      email: membership.user.email,
      image: membership.user.image,
      role: membership.role,
      createdAt: membership.user.createdAt,
    }),
    rateLimit
  )
}
