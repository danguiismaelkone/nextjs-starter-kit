import { verifyApiKey } from "@/lib/api-keys"

export type ApiKeyAuthCheck =
  | { ok: true; organizationId: string; apiKeyId: string }
  | { ok: false; status: 401; code: "unauthorized"; message: string }

/**
 * Authentifie une requête de l'API publique v1 (ITEM-053) via l'en-tête
 * `Authorization: Bearer sk_...` — s'appuie sur `verifyApiKey()` (ITEM-047),
 * qui rejette déjà une clé révoquée ou inconnue.
 */
export async function requireApiKeyAuth(request: Request): Promise<ApiKeyAuthCheck> {
  const header = request.headers.get("authorization")
  const match = header?.match(/^Bearer\s+(.+)$/i)
  const rawKey = match?.[1]?.trim()

  if (!rawKey) {
    return { ok: false, status: 401, code: "unauthorized", message: "En-tête Authorization: Bearer <clé API> requis." }
  }

  const verified = await verifyApiKey(rawKey)
  if (!verified) {
    return { ok: false, status: 401, code: "unauthorized", message: "Clé API invalide ou révoquée." }
  }

  return { ok: true, organizationId: verified.organizationId, apiKeyId: verified.apiKeyId }
}
