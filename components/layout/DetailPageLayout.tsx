import { Fragment, type ReactNode } from "react"
import Link from "next/link"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export interface DetailPageBreadcrumb {
  label: string
  href?: string
}

interface DetailPageLayoutProps {
  breadcrumbs?: DetailPageBreadcrumb[]
  /** En-tête de la page, généralement un `<PageHeader />` (ITEM-085). */
  header: ReactNode
  /** Contenu principal (colonne de gauche, ~2/3 de la largeur). */
  children: ReactNode
  /** Panneau détails (colonne de droite, ~1/3). Omis : le contenu principal prend toute la largeur. */
  details?: ReactNode
}

/**
 * Gabarit standard des pages fiche/détail (ITEM-086) : fil d'Ariane optionnel,
 * en-tête, puis grille de contenu à 2 colonnes (contenu principal 2/3, panneau
 * détails 1/3 — repasse en une colonne sous `lg:`). Server Component pur.
 */
export function DetailPageLayout({ breadcrumbs, header, children, details }: DetailPageLayoutProps) {
  return (
    <div className="flex flex-col gap-6">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((crumb, index) => (
              <Fragment key={crumb.label}>
                <BreadcrumbItem>
                  {crumb.href ? (
                    <BreadcrumbLink asChild>
                      <Link href={crumb.href}>{crumb.label}</Link>
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
                {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
              </Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      )}

      {header}

      {details ? (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">{children}</div>
          <div className="flex flex-col gap-6">{details}</div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">{children}</div>
      )}
    </div>
  )
}

export interface DetailField {
  label: string
  value: ReactNode
}

/**
 * Section du panneau détails : titre + paires clé/valeur (ex. « Détails »,
 * « Métadonnées » dans les captures de référence). Le contenu de chaque champ
 * reste libre (`ReactNode`) — pas de schéma de données imposé à l'appelant.
 */
export function DetailPanelSection({ title, fields }: { title: string; fields: DetailField[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="flex flex-col gap-3">
          {fields.map((field) => (
            <div key={field.label} className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">{field.label}</dt>
              <dd className="text-sm">{field.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
