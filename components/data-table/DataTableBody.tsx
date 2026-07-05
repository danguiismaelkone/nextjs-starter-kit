"use client"

import type { ReactNode } from "react"
import { Inbox, MoreHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { TableBody, TableCell, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { ColumnDef, EmptyState, RowAction } from "./types"
import { formatCurrency, formatDate, getCellValue } from "./utils"

function renderCell<T>(col: ColumnDef<T>, row: T): ReactNode {
  const raw = getCellValue(row, col.key)
  if (col.render) return col.render(raw, row)

  switch (col.type) {
    case "badge": {
      const conf = col.badgeMap?.[String(raw)]
      if (!conf) return raw == null || raw === "" ? "—" : String(raw)
      return (
        <Badge variant="outline" className={conf.className}>
          {conf.label}
        </Badge>
      )
    }
    case "date":
      return formatDate(raw)
    case "currency":
      return formatCurrency(raw, col.currency)
    default:
      return raw == null || raw === "" ? "—" : String(raw)
  }
}

function RowActionsMenu<T>({
  row,
  actions,
}: {
  row: T
  actions: RowAction<T>[]
}) {
  const visible = actions.filter((a) => !a.hidden?.(row))
  if (visible.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={(e) => e.stopPropagation()}
          aria-label="Actions"
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
        {visible.map((action) => (
          <DropdownMenuItem
            key={action.label}
            variant={action.variant === "destructive" ? "destructive" : "default"}
            onSelect={() => action.onClick(row)}
          >
            {action.icon}
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function DataTableBody<T>({
  columns,
  rows,
  rowId,
  loading,
  error,
  emptyState,
  selectable,
  selectedIds,
  onToggleRow,
  onRowClick,
  actions,
  pageSize,
}: {
  columns: ColumnDef<T>[]
  rows: T[]
  rowId: (row: T) => string
  loading?: boolean
  error?: string | null
  emptyState?: EmptyState
  selectable: boolean
  selectedIds: Set<string>
  onToggleRow: (id: string, checked: boolean) => void
  onRowClick?: (row: T) => void
  actions?: RowAction<T>[]
  pageSize: number
}) {
  const hasActions = Boolean(actions && actions.length > 0)
  const colSpan = columns.length + (selectable ? 1 : 0) + (hasActions ? 1 : 0)

  if (loading) {
    return (
      <TableBody>
        {Array.from({ length: Math.min(pageSize, 5) }).map((_, i) => (
          <TableRow key={`skeleton-${i}`}>
            {selectable ? (
              <TableCell>
                <Skeleton className="size-4" />
              </TableCell>
            ) : null}
            {columns.map((col) => (
              <TableCell key={col.key}>
                <Skeleton className="h-4 w-24" />
              </TableCell>
            ))}
            {hasActions ? (
              <TableCell>
                <Skeleton className="h-4 w-6" />
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    )
  }

  if (error) {
    return (
      <TableBody>
        <TableRow className="hover:bg-transparent">
          <TableCell
            colSpan={colSpan}
            className="h-32 text-center text-sm text-destructive"
          >
            {error}
          </TableCell>
        </TableRow>
      </TableBody>
    )
  }

  if (rows.length === 0) {
    return (
      <TableBody>
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={colSpan} className="h-32 text-center">
            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
              {emptyState?.icon ?? <Inbox className="size-6" />}
              <p className="text-sm font-medium text-foreground">
                {emptyState?.title ?? "Aucun résultat"}
              </p>
              {emptyState?.description ? (
                <p className="text-sm">{emptyState.description}</p>
              ) : null}
              {emptyState?.cta ? (
                <Button
                  size="sm"
                  className="mt-1"
                  onClick={emptyState.cta.onClick}
                >
                  {emptyState.cta.label}
                </Button>
              ) : null}
            </div>
          </TableCell>
        </TableRow>
      </TableBody>
    )
  }

  return (
    <TableBody>
      {rows.map((row) => {
        const id = rowId(row)
        const selected = selectedIds.has(id)
        return (
          <TableRow
            key={id}
            data-state={selected ? "selected" : undefined}
            className={cn(onRowClick && "cursor-pointer")}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
          >
            {selectable ? (
              <TableCell>
                <Checkbox
                  checked={selected}
                  onCheckedChange={(value) => onToggleRow(id, value === true)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Sélectionner la ligne"
                />
              </TableCell>
            ) : null}

            {columns.map((col) => (
              <TableCell
                key={col.key}
                className={cn(
                  col.align === "right" && "text-right",
                  col.align === "center" && "text-center",
                )}
              >
                {renderCell(col, row)}
              </TableCell>
            ))}

            {hasActions ? (
              <TableCell className="text-right">
                <RowActionsMenu row={row} actions={actions ?? []} />
              </TableCell>
            ) : null}
          </TableRow>
        )
      })}
    </TableBody>
  )
}
