import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface KpiCardProps {
  label: string
  value: number | string | null
  emptyLabel?: string
  icon?: LucideIcon
}

export function KpiCard({ label, value, emptyLabel = "Aucune activité", icon: Icon }: KpiCardProps) {
  const isEmpty = value === null || value === undefined

  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4 pt-6">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          {isEmpty ? (
            <>
              <p className="text-2xl font-semibold tracking-tight text-muted-foreground">—</p>
              <p className="text-xs text-muted-foreground">{emptyLabel}</p>
            </>
          ) : (
            <p className="text-2xl font-semibold tracking-tight">{value}</p>
          )}
        </div>
        {Icon && (
          <div className="rounded-lg bg-muted p-2 text-muted-foreground">
            <Icon className="h-5 w-5" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
