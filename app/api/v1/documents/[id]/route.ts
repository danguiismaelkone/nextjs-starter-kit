import { requireApiKeyAuth } from "@/lib/api-auth"
import { apiError, apiSuccess } from "@/lib/api-response"
import { checkRateLimit, rateLimitExceededResponse, withRateLimitHeaders } from "@/lib/rate-limit"
import { prisma } from "@/lib/prisma"

/** Document non supprimé de l'organisation propriétaire de la clé API, par id (ITEM-053). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiKeyAuth(request)
  if (!auth.ok) return apiError(auth.status, auth.code, auth.message)

  const rateLimit = await checkRateLimit(auth.organizationId, auth.apiKeyId)
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit)

  const { id } = await params

  const document = await prisma.document.findFirst({
    where: { id, organizationId: auth.organizationId, deletedAt: null },
    select: { id: true, name: true, size: true, mimeType: true, folderId: true, uploadedById: true, createdAt: true, updatedAt: true },
  })
  if (!document) {
    return withRateLimitHeaders(apiError(404, "not_found", "Document introuvable."), rateLimit)
  }

  return withRateLimitHeaders(apiSuccess(document), rateLimit)
}
