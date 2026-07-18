import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"
import { DASHBOARD_CACHE_REVALIDATE_SECONDS, dashboardStatsTag } from "@/lib/cache"

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export interface DashboardStats {
  totalUsers: number
  newUsersThisMonth: number
  /** Pas de suivi d'activité pour l'instant (aucune source de données) — état vide assumé. */
  recentActivityCount: number | null
}

/**
 * `organizationId` scope les statistiques à une organisation (ITEM-015 —
 * bascule d'organisation via `OrgSwitcher`). Omis, retombe sur l'ensemble de
 * la plateforme (comportement historique, conservé pour compatibilité).
 */
export async function getStats(organizationId?: string): Promise<DashboardStats> {
  return unstable_cache(
    async () => {
      const monthStart = startOfMonth()
      const orgFilter = organizationId
        ? { memberships: { some: { organizationId, status: "active" } } }
        : {}

      const [totalUsers, newUsersThisMonth] = await Promise.all([
        prisma.user.count({ where: orgFilter }),
        prisma.user.count({ where: { ...orgFilter, createdAt: { gte: monthStart } } }),
      ])

      return {
        totalUsers,
        newUsersThisMonth,
        recentActivityCount: null,
      }
    },
    ["dashboard-stats", organizationId ?? "global"],
    { tags: [dashboardStatsTag(organizationId)], revalidate: DASHBOARD_CACHE_REVALIDATE_SECONDS }
  )()
}

export interface ChartPoint {
  date: string
  label: string
  count: number
}

/**
 * Nouveaux utilisateurs par jour sur les `days` derniers jours (7 ou 30).
 * Seule métrique temporelle réellement disponible dans ce schéma (pas de
 * journal d'activité) — chaque jour de la période est présent même à zéro,
 * pour que l'appelant puisse détecter une période totalement vide.
 */
export async function getChartData(days: 7 | 30 = 7, organizationId?: string): Promise<ChartPoint[]> {
  return unstable_cache(
    async () => {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1))

      const users = await prisma.user.findMany({
        where: {
          createdAt: { gte: start },
          ...(organizationId ? { memberships: { some: { organizationId, status: "active" } } } : {}),
        },
        select: { createdAt: true },
      })

      const buckets = new Map<string, number>()
      for (let i = 0; i < days; i++) {
        const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
        buckets.set(d.toISOString().slice(0, 10), 0)
      }
      for (const user of users) {
        const key = user.createdAt.toISOString().slice(0, 10)
        buckets.set(key, (buckets.get(key) ?? 0) + 1)
      }

      return Array.from(buckets.entries()).map(([date, count]) => ({
        date,
        label: new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
        count,
      }))
    },
    ["dashboard-chart", String(days), organizationId ?? "global"],
    { tags: [dashboardStatsTag(organizationId)], revalidate: DASHBOARD_CACHE_REVALIDATE_SECONDS }
  )()
}
