import { requireApiKeyAuth } from "@/lib/api-auth"
import { apiError, apiSuccessList, parsePagination } from "@/lib/api-response"
import { checkRateLimit, rateLimitExceededResponse, withRateLimitHeaders } from "@/lib/rate-limit"
import { prisma } from "@/lib/prisma"

/** Documents non supprimés de l'organisation propriétaire de la clé API (ITEM-053). */
export async function GET(request: Request) {
  const auth = await requireApiKeyAuth(request)
  if (!auth.ok) return apiError(auth.status, auth.code, auth.message)

  const rateLimit = await checkRateLimit(auth.organizationId, auth.apiKeyId)
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit)

  const { page, perPage, skip, take } = parsePagination(request.url)
  const where = { organizationId: auth.organizationId, deletedAt: null }

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: { id: true, name: true, size: true, mimeType: true, folderId: true, uploadedById: true, createdAt: true, updatedAt: true },
    }),
    prisma.document.count({ where }),
  ])

  return withRateLimitHeaders(apiSuccessList(documents, total, page, perPage), rateLimit)
}
