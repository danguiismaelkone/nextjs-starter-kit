"use client"

import * as React from "react"
import Link from "next/link"
import { Columns3, Download, Plus, Upload, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DataTableFilterChip } from "./DataTableFilterChip"
import type {
  BulkAction,
  ColumnDef,
  FilterState,
  FilterValue,
} from "./types"

export function DataTableToolbar<T>({
  title,
  columns,
  visibleKeys,
  onToggleColumn,
  filters,
  onApplyFilter,
  onClearFilter,
  onResetFilters,
  createHref,
  createLabel,
  createSlot,
  onExport,
  onImportClick,
  selectedRows,
  bulkActions,
  onClearSelection,
}: {
  title?: string
  columns: ColumnDef<T>[]
  visibleKeys: Set<string>
  onToggleColumn: (key: string, visible: boolean) => void
  filters: FilterState
  onApplyFilter: (key: string, filter: FilterValue) => void
  onClearFilter: (key: string) => void
  onResetFilters: () => void
  createHref?: string
  createLabel?: string
  createSlot?: React.ReactNode
  onExport: () => void
  onImportClick?: () => void
  selectedRows: T[]
  bulkActions?: BulkAction<T>[]
  onClearSelection: () => void
}) {
  const filterableColumns = columns.filter((c) => c.filterable)
  const hasActiveFilters = Object.keys(filters).length > 0
  const selectedCount = selectedRows.length

  return (
    <div className="flex flex-col gap-3">
      {title ? <h2 className="text-base font-semibold">{title}</h2> : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {filterableColumns.map((col) => (
            <DataTableFilterChip
              key={col.key}
              column={col}
              value={filters[col.key]}
              onApply={(filter) => onApplyFilter(col.key, filter)}
              onClear={() => onClearFilter(col.key)}
            />
          ))}
          {hasActiveFilters ? (
            <Button variant="ghost" size="sm" onClick={onResetFilters}>
              Réinitialiser
              <X />
            </Button>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Columns3 />
                <span className="hidden sm:inline">Colonnes</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Afficher les colonnes</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {columns.map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.key}
                  checked={visibleKeys.has(col.key)}
                  onCheckedChange={(v) => onToggleColumn(col.key, v === true)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {col.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm" onClick={onExport}>
            <Download />
            <span className="hidden sm:inline">Exporter</span>
          </Button>

          {onImportClick ? (
            <Button variant="outline" size="sm" onClick={onImportClick}>
              <Upload />
              <span className="hidden sm:inline">Importer</span>
            </Button>
          ) : null}

          {createSlot ??
            (createHref ? (
              <Button size="sm" asChild>
                <Link href={createHref}>
                  <Plus />
                  {createLabel ?? "Ajouter"}
                </Link>
              </Button>
            ) : null)}
        </div>
      </div>

      {selectedCount > 0 && bulkActions && bulkActions.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
          <span className="font-medium">
            {selectedCount} sélectionné{selectedCount > 1 ? "s" : ""}
          </span>
          <Separator orientation="vertical" className="h-4" />
          {bulkActions.map((action) => (
            <Button
              key={action.label}
              size="sm"
              variant={action.variant === "destructive" ? "destructive" : "outline"}
              onClick={() => action.onClick(selectedRows)}
            >
              {action.icon}
              {action.label}
            </Button>
          ))}
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto"
            onClick={onClearSelection}
          >
            Annuler
          </Button>
        </div>
      ) : null}
    </div>
  )
}
