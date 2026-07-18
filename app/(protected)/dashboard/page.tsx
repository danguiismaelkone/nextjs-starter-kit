import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { getCurrentOrganization } from "@/lib/organization"
import { getStats, getChartData } from "@/lib/dashboard"
import { isFeatureEnabled } from "@/lib/feature-flags"
import { KpiGrid } from "@/components/dashboard/KpiGrid"
import { ActivityChart } from "@/components/dashboard/ActivityChart"
import { HighlightGrid } from "@/components/dashboard/HighlightGrid"
import { ResourceGrid } from "@/components/dashboard/ResourceGrid"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/layout/PageHeader"

export default async function DashboardPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")

  // `getCurrentOrganization()` (pas `requireOrganization()`) : cette page EST
  // /dashboard, la redirection de repli de `requireOrganization()` bouclerait.
  const organization = await getCurrentOrganization()

  const firstName = (session.user.name ?? "").trim().split(" ")[0] || "vous"
  const [stats, chartData7, chartData30, hasAdvancedAnalytics] = await Promise.all([
    getStats(organization?.id),
    getChartData(7, organization?.id),
    getChartData(30, organization?.id),
    organization ? isFeatureEnabled(organization.id, "advanced-analytics") : Promise.resolve(false),
  ])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Bonjour, ${firstName}`}
        description="Vue d'ensemble de votre activité"
        actions={[
          {
            key: "create",
            content: (
              <Button variant="outline" disabled>
                Créer
              </Button>
            ),
          },
          {
            key: "invite",
            content: (
              <Button variant="outline" disabled>
                Inviter
              </Button>
            ),
          },
        ]}
      />

      {hasAdvancedAnalytics && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm text-primary">
          🧪 Bêta — Analytique avancée activée pour {organization?.name} (feature flag{" "}
          <code>advanced-analytics</code>, ITEM-052).
        </div>
      )}

      <KpiGrid stats={stats} />

      <ActivityChart data7={chartData7} data30={chartData30} />

      <HighlightGrid />

      <ResourceGrid />
    </div>
  )
}
