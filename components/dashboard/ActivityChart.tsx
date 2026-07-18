"use client"

import { useState } from "react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { ChartPoint } from "@/lib/dashboard"

type Period = 7 | 30

interface ActivityChartProps {
  data7: ChartPoint[]
  data30: ChartPoint[]
}

export function ActivityChart({ data7, data30 }: ActivityChartProps) {
  const [period, setPeriod] = useState<Period>(7)
  const data = period === 7 ? data7 : data30
  const isEmpty = data.every((point) => point.count === 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Activité</CardTitle>
        <CardAction className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant={period === 7 ? "secondary" : "ghost"}
            onClick={() => setPeriod(7)}
          >
            7 jours
          </Button>
          <Button
            type="button"
            size="sm"
            variant={period === 30 ? "secondary" : "ghost"}
            onClick={() => setPeriod(30)}
          >
            30 jours
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex h-[260px] flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-muted-foreground">
              Aucune activité au cours des {period} derniers jours.
            </p>
            <Button type="button" variant="outline" size="sm" disabled>
              Essayer une action
            </Button>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data} margin={{ left: -10, right: 8 }}>
              <defs>
                <linearGradient id="activity-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="var(--muted-foreground)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ stroke: "var(--border)" }}
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  color: "var(--popover-foreground)",
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                name="Nouveaux utilisateurs"
                stroke="var(--chart-1)"
                fill="url(#activity-fill)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
