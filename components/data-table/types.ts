import type { ReactNode } from "react"

/** Supported column kinds. Drives rendering, sorting and filter UI. */
export type ColumnType = "text" | "currency" | "date" | "badge" | "relation"

/** Maps a raw badge value to a display label + Tailwind classes. */
export type BadgeMap = Record<string, { label: string; className: string }>

/** Declarative column definition, typed on the row model `T`. */
export type ColumnDef<T> = {
  /** Field name. Supports dotted access, e.g. `"user.email"`. */
  key: string
  label: string
  type: ColumnType
  sortable?: boolean
  filterable?: boolean
  /** Hidden by default; can be toggled on via the "Colonnes" menu. */
  hidden?: boolean
  /** Custom cell renderer. Receives the raw value and the whole row. */
  render?: (value: unknown, row: T) => ReactNode
  /** Required for `type: "badge"`. */
  badgeMap?: BadgeMap
  /** ISO currency code for `type: "currency"` (default: "EUR"). */
  currency?: string
  align?: "left" | "right" | "center"
  width?: string
}

export type SortDirection = "asc" | "desc"
export type SortState = { key: string; direction: SortDirection } | null

/** One active filter, discriminated by the column type it targets. */
export type FilterValue =
  | { type: "text"; value: string }
  | { type: "badge"; values: string[] }
  | { type: "date"; from?: string; to?: string }
  | {
      type: "currency"
      operator: "=" | ">" | ">=" | "<" | "<="
      amount: number
    }

export type FilterState = Record<string, FilterValue>

/** Row-level action rendered in the per-row `···` menu. */
export type RowAction<T> = {
  label: string
  icon?: ReactNode
  onClick: (row: T) => void
  variant?: "default" | "destructive" | "warning"
  /** Hide the action for a given row (e.g. already-archived). */
  hidden?: (row: T) => boolean
}

/** Action applied to the current multi-selection. */
export type BulkAction<T> = {
  label: string
  icon?: ReactNode
  onClick: (rows: T[]) => void
  variant?: "default" | "destructive"
}

/** Params handed to `onFetchData` in server-side mode. */
export type FetchParams = {
  page: number
  pageSize: number
  sort: SortState
  filters: FilterState
}

export type EmptyState = {
  title?: string
  description?: string
  icon?: ReactNode
  cta?: { label: string; onClick: () => void }
}

export type DataTableProps<T> = {
  // Data
  columns: ColumnDef<T>[]
  data: T[]
  /** Unique key per row (default: `"id"`). */
  rowKey?: keyof T | ((row: T) => string)
  loading?: boolean
  error?: string | null

  // Interactions
  onRowClick?: (row: T) => void
  actions?: RowAction<T>[]
  bulkActions?: BulkAction<T>[]

  // Header
  title?: string
  createHref?: string
  createLabel?: string
  onImport?: (rows: Record<string, string>[]) => void

  // Empty state
  emptyState?: EmptyState

  // Pagination
  defaultPageSize?: number
  pageSizeOptions?: number[]

  // Server-side mode
  serverSide?: boolean
  totalCount?: number
  onFetchData?: (params: FetchParams) => void
}
