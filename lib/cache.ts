/**
 * Tags de cache Next.js (`unstable_cache`/`revalidateTag`, ITEM-060) — noms
 * centralisés pour que les points de lecture (requêtes mises en cache,
 * `lib/dashboard.ts`) et les points d'invalidation (mutations qui en changent le
 * résultat) référencent exactement la même chaîne.
 */

/**
 * Statistiques + graphique du tableau de bord (`lib/dashboard.ts#getStats`,
 * `#getChartData`) — dérivées de `User`/`Membership`, donc invalidées à chaque
 * mutation d'adhésion d'organisation (ajout/retrait de membre).
 */
export function dashboardStatsTag(organizationId?: string): string {
  return `dashboard-stats:${organizationId ?? "global"}`
}

/**
 * Filet de sécurité en plus de l'invalidation explicite par tag — au cas où un
 * futur point de mutation de Membership/User oublierait d'appeler
 * `revalidateTag`, l'écart ne dépasse jamais cette durée. Réutilisée comme
 * `revalidate` de `unstable_cache` (lib/dashboard.ts) et comme `profile` de
 * `revalidateTag` (Next.js 16 exige un profil de durée de vie sur cet appel).
 */
export const DASHBOARD_CACHE_REVALIDATE_SECONDS = 60
export const DASHBOARD_CACHE_PROFILE = { expire: DASHBOARD_CACHE_REVALIDATE_SECONDS }
