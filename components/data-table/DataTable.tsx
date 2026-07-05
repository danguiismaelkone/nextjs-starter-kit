"use client"

import * as React from "react"

import { Table } from "@/components/ui/table"
import { DataTableHeader } from "./DataTableHeader"
import { DataTableBody } from "./DataTableBody"
import { DataTablePagination } from "./DataTablePagination"
import { DataTableToolbar } from "./DataTableToolbar"
import type { DataTableProps, FilterState, FilterValue, SortState } from "./types"
import { downloadCsv, filterData, parseCsv, sortData, toCsv } from "./utils"

/**
 * Generic, reusable data table (FATIHOUNE datatable module). Renders a toolbar
 * (filters, column toggle, export/import, bulk actions), a sortable table, and
 * pagination. Client mode sorts/filters/paginates the provided `data`; set
 * `serverSide` to delegate those to `onFetchData` instead.
 */
export function DataTable<T>({
  columns,
  data,
  rowKey = "id" as keyof T,
  loading,
  error,
  onRowClick,
  actions,
  bulkActions,
  title,
  createHref,
  createLabel,
  onImport,
  emptyState,
  defaultPageSize = 25,
  pageSizeOptions = [10, 25, 50],
  serverSide = false,
  totalCount,
  onFetchData,
}: DataTableProps<T>) {
  const [sort, setSort] = React.useState<SortState>(null)
  const [filters, setFilters] = React.useState<FilterState>({})
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(defaultPageSize)
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [visibleKeys, setVisibleKeys] = React.useState<Set<string>>(
    () => new Set(columns.filter((c) => !c.hidden).map((c) => c.key)),
  )
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const rowId = React.useCallback(
    (row: T): string =>
      typeof rowKey === "function"
        ? rowKey(row)
        : String((row as Record<string, unknown>)[rowKey as string]),
    [rowKey],
  )

  const visibleColumns = React.useMemo(
    () => columns.filter((c) => visibleKeys.has(c.key)),
    [columns, visibleKeys],
  )

  // Client-side pipeline: filter → sort → paginate. Skipped in server mode.
  const processed = React.useMemo(() => {
    if (serverSide) return data
    return sortData(filterData(data, filters), sort)
  }, [serverSide, data, filters, sort])

  const total = serverSide ? (totalCount ?? 0) : processed.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(page, pageCount)

  const pageRows = React.useMemo(() => {
    if (serverSide) return data
    const start = (currentPage - 1) * pageSize
    return processed.slice(start, start + pageSize)
  }, [serverSide, data, processed, currentPage, pageSize])

  // Server mode: refetch whenever a query parameter changes.
  React.useEffect(() => {
    if (serverSide) {
      onFetchData?.({ page: currentPage, pageSize, sort, filters })
    }
  }, [serverSide, onFetchData, currentPage, pageSize, sort, filters])

  // Selection is scoped to the visible page; reset it when the view changes.
  React.useEffect(() => {
    setSelectedIds(new Set())
  }, [currentPage, pageSize, filters, data])

  function handleSort(key: string) {
    setSort((prev) => {
      if (prev?.key !== key) return { key, direction: "asc" }
      if (prev.direction === "asc") return { key, direction: "desc" }
      return null
    })
  }

  function applyFilter(key: string, filter: FilterValue) {
    setFilters((prev) => ({ ...prev, [key]: filter }))
    setPage(1)
  }

  function clearFilter(key: string) {
    setFilters((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setPage(1)
  }

  function toggleColumn(key: string, visible: boolean) {
    setVisibleKeys((prev) => {
      const next = new Set(prev)
      if (visible) next.add(key)
      else next.delete(key)
      return next
    })
  }

  function toggleRow(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? new Set(pageRows.map(rowId)) : new Set())
  }

  const selectedRows = React.useMemo(
    () => pageRows.filter((row) => selectedIds.has(rowId(row))),
    [pageRows, selectedIds, rowId],
  )

  const allSelected =
    pageRows.length > 0 && pageRows.every((row) => selectedIds.has(rowId(row)))
  const someSelected = selectedIds.size > 0 && !allSelected

  function handleExport() {
    const rows = serverSide ? data : processed
    downloadCsv("export.csv", toCsv(visibleColumns, rows))
  }

  async function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file || !onImport) return
    const text = await file.text()
    onImport(parseCsv(text))
  }

  const selectable = Boolean(bulkActions && bulkActions.length > 0)

  return (
    <div className="flex flex-col gap-4">
      <DataTableToolbar
        title={title}
        columns={columns}
        visibleKeys={visibleKeys}
        onToggleColumn={toggleColumn}
        filters={filters}
        onApplyFilter={applyFilter}
        onClearFilter={clearFilter}
        onResetFilters={() => {
          setFilters({})
          setPage(1)
        }}
        createHref={createHref}
        createLabel={createLabel}
        onExport={handleExport}
        onImportClick={onImport ? () => fileInputRef.current?.click() : undefined}
        selectedRows={selectedRows}
        bulkActions={bulkActions}
        onClearSelection={() => setSelectedIds(new Set())}
      />

      {onImport ? (
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={handleImportFile}
        />
      ) : null}

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <DataTableHeader
            columns={visibleColumns}
            sort={sort}
            onSort={handleSort}
            selectable={selectable}
            allSelected={allSelected}
            someSelected={someSelected}
            onToggleAll={toggleAll}
            hasActions={Boolean(actions && actions.length > 0)}
          />
          <DataTableBody
            columns={visibleColumns}
            rows={pageRows}
            rowId={rowId}
            loading={loading}
            error={error}
            emptyState={emptyState}
            selectable={selectable}
            selectedIds={selectedIds}
            onToggleRow={toggleRow}
            onRowClick={onRowClick}
            actions={actions}
            pageSize={pageSize}
          />
        </Table>
      </div>

      <DataTablePagination
        page={currentPage}
        pageSize={pageSize}
        pageSizeOptions={pageSizeOptions}
        total={total}
        selectedCount={selectedIds.size}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size)
          setPage(1)
        }}
      />
    </div>
  )
}
