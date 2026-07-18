import type { ReactNode } from "react"
import { PageHeaderActions } from "@/components/layout/PageHeaderActions"

export interface PageHeaderAction {
  key: string
  content: ReactNode
}

interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  /**
   * Zone d'actions à droite — un `ReactNode` libre (rendu tel quel, sans
   * repli), ou une liste d'actions qui se replient dans un menu déroulant
   * quand elles ne tiennent plus sur une ligne (dès 2 actions, voir
   * `PageHeaderActions`).
   */
  actions?: ReactNode | PageHeaderAction[]
}

/**
 * En-tête standard de page (ITEM-085, généralise `ListPageHeader` d'ITEM-077
 * aux pages fiche détail) : grille 3 colonnes, titre/sous-titre occupant les
 * 2 colonnes de gauche, actions la colonne de droite. Server Component pur —
 * le repli en menu mesuré (seule partie interactive) est isolé dans
 * `PageHeaderActions`, importé séparément pour ne pas rendre tout l'en-tête
 * client alors que la majorité des pages n'ont pas d'actions à replier.
 */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  const hasActions = Array.isArray(actions) ? actions.length > 0 : !!actions

  const titleBlock = (
    <div className={hasActions ? "sm:col-span-2" : undefined}>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  )

  // Sans action, le titre occupe toute la largeur — la grille 3 colonnes ne
  // sert qu'à réserver la colonne de droite aux actions quand il y en a,
  // jamais à laisser un tiers de la largeur vide sans raison.
  if (!hasActions) return titleBlock

  return (
    <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-3">
      {titleBlock}
      {Array.isArray(actions) ? (
        <PageHeaderActions actions={actions} />
      ) : (
        <div className="flex flex-wrap items-center gap-2 sm:col-span-1 sm:justify-end">{actions}</div>
      )}
    </div>
  )
}
