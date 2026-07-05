"use client"

import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { ColumnDef, SortState } from "./types"

export function DataTableHeader<T>({
  columns,
  sort,
  onSort,
  selectable,
  allSelected,
  someSelected,
  onToggleAll,
  hasActions,
}: {
  columns: ColumnDef<T>[]
  sort: SortState
  onSort: (key: string) => void
  selectable: boolean
  allSelected: boolean
  someSelected: boolean
  onToggleAll: (checked: boolean) => void
  hasActions: boolean
}) {
  return (
    <TableHeader className="bg-muted/40">
      <TableRow>
        {selectable ? (
          <TableHead className="w-10">
            <Checkbox
              checked={allSelected ? true : someSelected ? "indeterminate" : false}
              onCheckedChange={(value) => onToggleAll(value === true)}
              aria-label="Tout sélectionner"
            />
          </TableHead>
        ) : null}

        {columns.map((col) => {
          const active = sort?.key === col.key
          return (
            <TableHead
              key={col.key}
              style={col.width ? { width: col.width } : undefined}
              className={cn(
                col.align === "right" && "text-right",
                col.align === "center" && "text-center",
              )}
            >
              {col.sortable ? (
                <button
                  type="button"
                  onClick={() => onSort(col.key)}
                  className={cn(
                    "-mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 transition-colors hover:text-foreground",
                    col.align === "right" && "flex-row-reverse",
                  )}
                >
                  {col.label}
                  {active ? (
                    sort?.direction === "asc" ? (
                      <ArrowUp className="size-3.5" />
                    ) : (
                      <ArrowDown className="size-3.5" />
                    )
                  ) : (
                    <ChevronsUpDown className="size-3.5 opacity-40" />
                  )}
                </button>
              ) : (
                col.label
              )}
            </TableHead>
          )
        })}

        {hasActions ? (
          <TableHead className="w-10 text-right">
            <span className="sr-only">Actions</span>
          </TableHead>
        ) : null}
      </TableRow>
    </TableHeader>
  )
}
