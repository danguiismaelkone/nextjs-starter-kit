import Link from "next/link"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"

export interface CategoryStat {
  label: string
  count: number
  /** Valeur du paramètre de requête pour cette catégorie — `null` = catégorie "Tout" (retire le paramètre). */
  value: string | null
}

interface CategoryStatCardsProps {
  stats: CategoryStat[]
  /** Nom du paramètre de requête à faire varier au clic (ex. "status"). */
  paramName: string
  /** Valeur actuelle du paramètre (depuis `searchParams` côté page), pour l'état actif. */
  activeValue?: string
  /** Chemin de la page courante (les autres query params déjà actifs sont préservés via `preserveParams`). */
  basePath: string
  /** Autres paramètres de recherche à conserver dans le lien (ex. `q`). */
  preserveParams?: Record<string, string | undefined>
}

function buildHref(
  basePath: string,
  paramName: string,
  value: string | undefined,
  preserveParams?: Record<string, string | undefined>
): string {
  const params = new URLSearchParams()
  if (preserveParams) {
    for (const [key, val] of Object.entries(preserveParams)) {
      if (val) params.set(key, val)
    }
  }
  if (value) params.set(paramName, value)
  const query = params.toString()
  return query ? `${basePath}?${query}` : basePath
}

/**
 * Cartes de statistiques par catégorie (ITEM-077) — cliquables, l'URL reflète
 * la catégorie active (`?paramName=value`, partageable/rechargeable). Server
 * Component pur : le clic est une navigation `<Link>` classique, l'état actif
 * est déterminé par la page appelante à partir de ses propres `searchParams`,
 * pas par un état client qui se perdrait au rechargement.
 */
export function CategoryStatCards({ stats, paramName, activeValue, basePath, preserveParams }: CategoryStatCardsProps) {
  return (
    <div
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(var(--stat-cols),minmax(0,1fr))]"
      style={{ "--stat-cols": stats.length } as React.CSSProperties}
    >
      {stats.map((stat) => {
        const isActive = (activeValue ?? null) === stat.value
        return (
          <Link key={stat.label} href={buildHref(basePath, paramName, stat.value ?? undefined, preserveParams)}>
            <Card className={cn("transition-colors hover:bg-muted/50", isActive && "border-primary ring-1 ring-primary")}>
              <CardContent className="pt-6">
                <p className={cn("text-sm", isActive ? "text-primary" : "text-muted-foreground")}>{stat.label}</p>
                <p className="text-2xl font-semibold tracking-tight">{stat.count}</p>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
