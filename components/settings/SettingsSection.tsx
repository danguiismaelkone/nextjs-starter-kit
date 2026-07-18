import type { ReactNode } from "react"

interface SettingsSectionProps {
  title: string
  children: ReactNode
}

/**
 * Regroupement en catégories du hub `/settings` (ITEM-082) : titre de section +
 * grille de cartes à 3 colonnes fixes sur desktop. Chaque carte garde une
 * taille fixe (1/3 de la ligne) même seule sur sa ligne — pas d'étirement pour
 * remplir l'espace restant.
 */
export function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </div>
  )
}
