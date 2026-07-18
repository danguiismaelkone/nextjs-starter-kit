import type { ReactNode } from "react"

export interface DataTableCellHelpers {
  /** Recharge la page courante (mêmes filtres/tri/numéro de page) — pour une action de ligne qui mute une donnée affichée. */
  refresh: () => void
}

export type DataTableSortDirection = "asc" | "desc"

export interface DataTableSort {
  columnId: string
  direction: DataTableSortDirection
}

/** `columnId -> valeur du filtre` (une seule valeur par colonne, pas de filtres multi-valeurs pour rester simple). */
export type DataTableFilters = Record<string, string>

/** Contexte passé à `fetchPage` en plus du numéro de page (ITEM-076) — deuxième argument optionnel : les Server Actions liées existantes (`.bind(null, ...)`, un seul paramètre `page`) restent compatibles, l'argument supplémentaire est simplement ignoré à l'exécution. */
export interface DataTableFetchContext {
  sort: DataTableSort | null
  filters: DataTableFilters
  /** Recherche texte intégrée (ITEM-079, chip dédié) — chaîne vide si aucune recherche active. Distincte de `filters` : ne cible pas une colonne précise, porte sur plusieurs champs à la fois côté serveur (ex. nom + e-mail). */
  search: string
}

/** Référence impérative exposée par `DataTable` (ITEM-079) — permet à une action placée en dehors de son arbre (ex. `ListPageHeader.actions`) de déclencher un rafraîchissement après une mutation. */
export interface DataTableHandle {
  refresh: () => void
}

export interface DataTableFilterOption {
  label: string
  value: string
}

export interface DataTableColumn<T> {
  id: string
  header: ReactNode
  cell: (row: T, helpers: DataTableCellHelpers) => ReactNode
  headClassName?: string
  cellClassName?: string
  /** Active le tri sur cette colonne (en-tête cliquable) — appliqué côté serveur via `fetchPage`. */
  sortable?: boolean
  /** Active un filtre pour cette colonne (chip au-dessus de la table). */
  filterable?: boolean
  /** `"select"` affiche un choix parmi `filterOptions` ; `"text"` (défaut) un champ libre. */
  filterType?: "text" | "select"
  filterOptions?: DataTableFilterOption[]
  /** Libellé du filtre/de la colonne dans les menus (défaut : déduit de `id`). */
  label?: string
  /** Masquée par défaut (visible ensuite via « Modifier les colonnes »). */
  defaultHidden?: boolean
  /** Peut être masquée/affichée via « Modifier les colonnes » (défaut : true). */
  hideable?: boolean
  /** Valeur texte pour l'export CSV — colonne exclue de l'export si absente. */
  exportValue?: (row: T) => string
}

export interface DataTablePage<T> {
  data: T[]
  total: number
}

export interface DataTableBulkAction<T> {
  label: string
  icon?: ReactNode
  onClick: (rows: T[], helpers: DataTableCellHelpers) => void | Promise<void>
  variant?: "default" | "destructive" | "outline"
  /** Message de confirmation avant exécution (ex. « Désactiver 3 utilisateurs ? ») — pas de confirmation si absent. */
  confirm?: (rows: T[]) => string
}

export interface DataTableImportResult {
  successCount: number
  errors: string[]
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  initialData: T[]
  initialTotal: number
  pageSize: number
  getRowId: (row: T) => string
  /** Server Action (éventuellement liée via `.bind(null, ...filtres)`) — appelée à chaque changement de page/tri/filtre. */
  fetchPage: (page: number, context?: DataTableFetchContext) => Promise<DataTablePage<T>>
  emptyMessage?: string
  /** Barre au-dessus de la table (ex. bouton "Créer") — reçoit les mêmes `helpers` que les cellules pour se recharger après une mutation. */
  toolbar?: (helpers: DataTableCellHelpers) => ReactNode

  /** Active la sélection de lignes (cases à cocher) + les actions groupées listées ici. */
  bulkActions?: DataTableBulkAction<T>[]
  /** Bouton d'export CSV des données actuellement affichées (respecte les filtres actifs). */
  enableExport?: boolean
  exportFilename?: string
  /** Bouton d'import CSV — `rows` = lignes du CSV (en-têtes en clés). */
  onImport?: (rows: Record<string, string>[]) => Promise<DataTableImportResult>
  /** Aide affichée dans le dialog d'import (ex. en-têtes de colonnes attendus). */
  importHint?: string
  /** Première colonne fixe au défilement horizontal (utile quand les colonnes dépassent la largeur visible). */
  stickyFirstColumn?: boolean
  /**
   * Filtres actifs dès le montage (ITEM-077) — utile quand la page appelante
   * dérive déjà un filtre initial de l'URL (ex. `CategoryStatCards`,
   * `?status=active`) : les chips de filtre du DataTable démarrent
   * visuellement synchronisées avec ce que `initialData`/`initialTotal`
   * reflètent déjà côté serveur, au lieu de repartir à vide.
   */
  initialFilters?: DataTableFilters
  /** Active une recherche texte intégrée, sous forme de chip, sur la même ligne que les filtres par colonne (ITEM-079). */
  enableSearch?: boolean
  searchPlaceholder?: string
  /** Valeur de recherche active dès le montage (ex. dérivée de l'URL par la page appelante) — comme `initialFilters`. */
  initialSearch?: string
}
