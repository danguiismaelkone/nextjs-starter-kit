import { Activity, UserPlus, Users } from "lucide-react"
import { KpiCard } from "./KpiCard"
import type { DashboardStats } from "@/lib/dashboard"

export function KpiGrid({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <KpiCard label="Utilisateurs" value={stats.totalUsers} icon={Users} />
      <KpiCard label="Nouveaux ce mois" value={stats.newUsersThisMonth} icon={UserPlus} />
      <KpiCard
        label="Activité récente"
        value={stats.recentActivityCount}
        emptyLabel="Aucune activité pour l'instant"
        icon={Activity}
      />
    </div>
  )
}
