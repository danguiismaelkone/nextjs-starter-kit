import { NextResponse, type NextRequest } from "next/server"
import { ORGANIZATION_DOMAIN_HEADER, normalizeHost } from "@/lib/domains"

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"])

/**
 * Routes API exclues de la vérification CSRF ci-dessous :
 * - `v1/*` : authentifiées par clé API (`Authorization: Bearer`), pas par cookie de
 *   session — aucun cookie ambiant, donc pas de surface CSRF (ITEM-053/054).
 * - `webhooks/*` : appelées par des tiers (Stripe), authentifiées par signature de
 *   payload, jamais par le navigateur de l'utilisateur.
 * - `auth/*` : gérées par Better Auth, qui applique déjà sa propre vérification
 *   d'origine (`trustedOrigins`) — éviter une double logique divergente ici.
 */
const EXEMPT_PREFIXES = ["/api/v1/", "/api/webhooks/", "/api/auth/"]

/**
 * Les Server Actions Next.js bénéficient nativement d'une vérification d'origine
 * contre le CSRF (depuis Next 13.4) ; les Route Handlers sous `app/api/**` n'en
 * bénéficient PAS automatiquement (ITEM-055, critère 3). Ce middleware applique la
 * même protection — comparaison de l'en-tête `Origin` à l'origine de la requête —
 * aux routes API mutantes authentifiées par cookie de session.
 *
 * Pose aussi `x-organization-domain` à partir du `Host` réel sur TOUTE requête
 * (ITEM-068, White Label) — résolution de l'organisation active par domaine
 * personnalisé plutôt que par sous-chemin, consommée par `getCurrentOrganization()`
 * (`lib/organization.ts`). Toujours écrasé (`Headers.set`, pas `append`), donc pas
 * usurpable par le client. C'est pour ce second usage — pas seulement le CSRF — que
 * le matcher couvre toutes les routes et pas uniquement `/api/*` (la portée du
 * contrôle CSRF ci-dessous reste, elle, volontairement inchangée : uniquement
 * `/api/*`, méthodes mutantes, hors préfixes exemptés).
 *
 * Fichier nommé `proxy.ts` (et non `middleware.ts`) : convention Next.js 16, qui
 * déprécie `middleware.ts` au profit de `proxy.ts` avec un export `proxy`.
 */
export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set(ORGANIZATION_DOMAIN_HEADER, normalizeHost(request.headers.get("host")))
  const response = NextResponse.next({ request: { headers: requestHeaders } })

  const { pathname } = request.nextUrl
  if (!pathname.startsWith("/api/")) {
    return response
  }

  if (!MUTATING_METHODS.has(request.method) || EXEMPT_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return response
  }

  const origin = request.headers.get("origin")
  if (!origin || origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: { code: "forbidden", message: "Origine de la requête non autorisée." } }, { status: 403 })
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
