"use client"

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useState,
  useTransition,
  type ForwardedRef,
  type ReactElement,
} from "react"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DataTableToolbar } from "./DataTableToolbar"
import { DataTablePagination } from "./DataTablePagination"
import { buildCsv, downloadTextFile } from "./csv"
import type {
  DataTableBulkAction,
  DataTableCellHelpers,
  DataTableFilters,
  DataTableHandle,
  DataTableProps,
  DataTableSort,
} from "./types"

export type {
  DataTableCellHelpers,
  DataTableColumn,
  DataTablePage,
  DataTableProps,
  DataTableBulkAction,
  DataTableFilterOption,
  DataTableFetchContext,
  DataTableHandle,
  DataTableSort,
  DataTableFilters,
  DataTableImportResult,
} from "./types"

/**
 * Table générique avec pagination serveur (module `datatable`, ITEM-061),
 * complétée (ITEM-076) de tri, filtres par colonne, sélection + actions
 * groupées, export/import CSV, colonnes masquables et première colonne fixe
 * au défilement horizontal ; puis (ITEM-077/079) d'une recherche intégrée en
 * chip et d'une référence impérative (`ref.refresh()`) pour qu'une action
 * placée hors de cet arbre (ex. bouton d'en-tête) puisse rafraîchir les
 * données. Toutes ces capacités sont opt-in par colonne/prop — un
 * consommateur qui ne les déclare pas obtient exactement le comportement
 * d'avant ITEM-076 (aucune régression pour `/billing/invoices`/`/settings/audit`).
 */
function DataTableInner<T>(
  {
    columns,
    initialData,
    initialTotal,
    pageSize,
    getRowId,
    fetchPage,
    emptyMessage = "Aucun résultat.",
    toolbar,
    bulkActions,
    enableExport,
    exportFilename = "export.csv",
    onImport,
    importHint,
    stickyFirstColumn,
    initialFilters,
    enableSearch,
    searchPlaceholder,
    initialSearch,
  }: DataTableProps<T>,
  ref: ForwardedRef<DataTableHandle>
) {
  const [page, setPage] = useState(1)
  const [data, setData] = useState(initialData)
  const [total, setTotal] = useState(initialTotal)
  const [isPending, startTransition] = useTransition()
  const [sort, setSort] = useState<DataTableSort | null>(null)
  const [filters, setFilters] = useState<DataTableFilters>(() => initialFilters ?? {})
  const [search, setSearch] = useState(() => initialSearch ?? "")
  const [hiddenColumnIds, setHiddenColumnIds] = useState<Set<string>>(
    () => new Set(columns.filter((column) => column.defaultHidden).map((column) => column.id))
  )
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkPending, setBulkPending] = useState(false)

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const visibleColumns = useMemo(
    () => columns.filter((column) => !hiddenColumnIds.has(column.id)),
    [columns, hiddenColumnIds]
  )
  const hasSelectionColumn = !!bulkActions && bulkActions.length > 0

  const loadPage = useCallback(
    (
      targetPage: number,
      nextSort: DataTableSort | null = sort,
      nextFilters: DataTableFilters = filters,
      nextSearch: string = search
    ) => {
      startTransition(async () => {
        const result = await fetchPage(targetPage, { sort: nextSort, filters: nextFilters, search: nextSearch })
        setData(result.data)
        setTotal(result.total)
        setPage(targetPage)
        // La sélection ne survit pas à un changement de page/tri/filtre : les
        // lignes sélectionnées ne sont plus forcément celles affichées.
        setSelectedIds(new Set())
      })
    },
    [fetchPage, sort, filters, search]
  )

  // Référence impérative (ITEM-079) : permet à une action placée hors de cet
  // arbre (ex. `ListPageHeader.actions`) de déclencher un rafraîchissement
  // après une mutation, sans dépendre du `toolbar` interne.
  useImperativeHandle(ref, () => ({ refresh: () => loadPage(page) }), [loadPage, page])

  function goToPage(target: number) {
    if (target < 1 || target > totalPages || target === page) return
    loadPage(target)
  }

  function toggleSort(columnId: string) {
    const next: DataTableSort | null =
      sort?.columnId === columnId
        ? sort.direction === "asc"
          ? { columnId, direction: "desc" }
          : null
        : { columnId, direction: "asc" }
    setSort(next)
    loadPage(1, next, filters, search)
  }

  function setFilter(columnId: string, value: string | undefined) {
    const next = { ...filters }
    if (value) next[columnId] = value
    else delete next[columnId]
    setFilters(next)
    loadPage(1, sort, next, search)
  }

  function setSearchValue(value: string) {
    setSearch(value)
    loadPage(1, sort, filters, value)
  }

  function clearFilters() {
    setFilters({})
    setSearch("")
    loadPage(1, sort, {}, "")
  }

  function toggleColumnVisibility(columnId: string) {
    setHiddenColumnIds((prev) => {
      const next = new Set(prev)
      if (next.has(columnId)) next.delete(columnId)
      else next.add(columnId)
      return next
    })
  }

  function toggleRowSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAllOnPage() {
    setSelectedIds((prev) => {
      const allSelected = data.length > 0 && data.every((row) => prev.has(getRowId(row)))
      return allSelected ? new Set() : new Set(data.map(getRowId))
    })
  }

  const cellHelpers: DataTableCellHelpers = { refresh: () => loadPage(page) }

  function handleExport() {
    const exportableColumns = visibleColumns.filter((column) => column.exportValue)
    if (exportableColumns.length === 0) return
    const headers = exportableColumns.map((column) => (typeof column.header === "string" ? column.header : column.label ?? column.id))
    const rows = data.map((row) => exportableColumns.map((column) => column.exportValue!(row)))
    downloadTextFile(exportFilename, buildCsv(headers, rows))
  }

  const selectedRows = data.filter((row) => selectedIds.has(getRowId(row)))

  async function runBulkAction(action: DataTableBulkAction<T>) {
    if (action.confirm && !window.confirm(action.confirm(selectedRows))) return
    setBulkPending(true)
    try {
      await action.onClick(selectedRows, cellHelpers)
      setSelectedIds(new Set())
    } finally {
      setBulkPending(false)
    }
  }

  const allOnPageSelected = data.length > 0 && data.every((row) => selectedIds.has(getRowId(row)))
  const colSpan = visibleColumns.length + (hasSelectionColumn ? 1 : 0)

  return (
    <div className="flex flex-col gap-4">
      {toolbar && <div className="flex justify-end">{toolbar(cellHelpers)}</div>}

      <DataTableToolbar
        columns={columns}
        filters={filters}
        onFilterChange={setFilter}
        onClearFilters={clearFilters}
        hiddenColumnIds={hiddenColumnIds}
        onToggleColumnVisibility={toggleColumnVisibility}
        onExport={enableExport ? handleExport : undefined}
        onImport={onImport}
        importHint={importHint}
        enableSearch={enableSearch}
        search={search}
        onSearchChange={setSearchValue}
        searchPlaceholder={searchPlaceholder}
      />

      {hasSelectionColumn && selectedIds.size > 0 && (
        <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 text-sm">
          <span>
            {selectedIds.size} sélectionné{selectedIds.size > 1 ? "s" : ""}
          </span>
          <div className="flex gap-2">
            {bulkActions!.map((action) => (
              <Button
                key={action.label}
                type="button"
                size="sm"
                variant={action.variant === "destructive" ? "destructive" : action.variant === "outline" ? "outline" : "default"}
                disabled={bulkPending}
                onClick={() => runBulkAction(action)}
              >
                {action.icon}
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {hasSelectionColumn && (
                <TableHead className={cn("w-10", stickyFirstColumn && "sticky left-0 z-10 bg-background")}>
                  <Checkbox
                    checked={allOnPageSelected}
                    onCheckedChange={toggleSelectAllOnPage}
                    aria-label="Tout sélectionner sur cette page"
                  />
                </TableHead>
              )}
              {visibleColumns.map((column, index) => (
                <TableHead
                  key={column.id}
                  className={cn(
                    column.headClassName,
                    stickyFirstColumn && index === 0 && !hasSelectionColumn && "sticky left-0 z-10 bg-background"
                  )}
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-foreground"
                      onClick={() => toggleSort(column.id)}
                    >
                      {column.header}
                      {sort?.columnId === column.id ? (
                        sort.direction === "asc" ? (
                          <ArrowUp className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </button>
                  ) : (
                    column.header
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className={isPending ? "opacity-60 transition-opacity" : undefined}>
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={colSpan} className="text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
            {data.map((row) => {
              const rowId = getRowId(row)
              return (
                <TableRow key={rowId} data-state={selectedIds.has(rowId) ? "selected" : undefined}>
                  {hasSelectionColumn && (
                    <TableCell className={cn("w-10", stickyFirstColumn && "sticky left-0 z-10 bg-background")}>
                      <Checkbox
                        checked={selectedIds.has(rowId)}
                        onCheckedChange={() => toggleRowSelected(rowId)}
                        aria-label="Sélectionner la ligne"
                      />
                    </TableCell>
                  )}
                  {visibleColumns.map((column, index) => (
                    <TableCell
                      key={column.id}
                      className={cn(
                        column.cellClassName,
                        stickyFirstColumn && index === 0 && !hasSelectionColumn && "sticky left-0 z-10 bg-background"
                      )}
                    >
                      {column.cell(row, cellHelpers)}
                    </TableCell>
                  ))}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination page={page} totalPages={totalPages} total={total} disabled={isPending} onPageChange={goToPage} />
    </div>
  )
}

export const DataTable = forwardRef(DataTableInner) as <T>(
  props: DataTableProps<T> & { ref?: ForwardedRef<DataTableHandle> }
) => ReactElement
