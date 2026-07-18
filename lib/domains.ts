/**
 * En-tête posé par `middleware.ts` à partir du `Host` de la requête (ITEM-068)
 * — toujours écrasé par le middleware (jamais transmis tel quel depuis le
 * client), donc fiable comme source côté serveur (`getCurrentOrganization`).
 */
export const ORGANIZATION_DOMAIN_HEADER = "x-organization-domain"

/** `Host` sans le port (`app.example.com:3000` → `app.example.com`), en minuscules. */
export function normalizeHost(host: string | null | undefined): string {
  return (host ?? "").trim().toLowerCase().split(":")[0]
}

/**
 * Domaine propre à la plateforme, dérivé de `BETTER_AUTH_URL` (même source
 * que le reste du repo pour ses URLs absolues — invitations, callback SSO...).
 * Sert uniquement à court-circuiter la résolution par domaine personnalisé
 * pour le trafic normal (`getCurrentOrganization`) — une valeur imparfaite
 * (LB interne, domaine de préprod distinct) ne casse rien : au pire, quelques
 * requêtes de plus retombent sur la recherche `customDomain` avant de
 * repasser sur le cookie, ce n'est pas la frontière de sécurité elle-même.
 */
export function platformHostname(): string {
  try {
    return normalizeHost(new URL(process.env.BETTER_AUTH_URL ?? "http://localhost:3000").hostname)
  } catch {
    return "localhost"
  }
}
