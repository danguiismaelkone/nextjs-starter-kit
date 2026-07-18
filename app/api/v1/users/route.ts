import { requireApiKeyAuth } from "@/lib/api-auth"
import { apiError, apiSuccessList, parsePagination } from "@/lib/api-response"
import { checkRateLimit, rateLimitExceededResponse, withRateLimitHeaders } from "@/lib/rate-limit"
import { prisma } from "@/lib/prisma"

/** Membres de l'organisation propriétaire de la clé API (ITEM-053). */
export async function GET(request: Request) {
  const auth = await requireApiKeyAuth(request)
  if (!auth.ok) return apiError(auth.status, auth.code, auth.message)

  const rateLimit = await checkRateLimit(auth.organizationId, auth.apiKeyId)
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit)

  const { page, perPage, skip, take } = parsePagination(request.url)

  const [memberships, total] = await Promise.all([
    prisma.membership.findMany({
      where: { organizationId: auth.organizationId, status: "active" },
      orderBy: { createdAt: "asc" },
      skip,
      take,
      include: { user: { select: { id: true, name: true, email: true, image: true, createdAt: true } } },
    }),
    prisma.membership.count({ where: { organizationId: auth.organizationId, status: "active" } }),
  ])

  const users = memberships.map((membership) => ({
    id: membership.user.id,
    name: membership.user.name,
    email: membership.user.email,
    image: membership.user.image,
    role: membership.role,
    createdAt: membership.user.createdAt,
  }))

  return withRateLimitHeaders(apiSuccessList(users, total, page, perPage), rateLimit)
}
