"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"

export function DataTablePagination({
  page,
  pageSize,
  pageSizeOptions,
  total,
  selectedCount,
  onPageChange,
  onPageSizeChange,
}: {
  page: number
  pageSize: number
  pageSizeOptions: number[]
  total: number
  selectedCount: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-3 text-sm">
      <div className="text-muted-foreground">
        {selectedCount > 0 ? (
          <span>
            {selectedCount} sélectionné{selectedCount > 1 ? "s" : ""} ·{" "}
          </span>
        ) : null}
        {from}–{to} sur {total}
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-muted-foreground">
          <span className="hidden sm:inline">Lignes par page</span>
          <Select
            className="h-8 w-16"
            value={String(pageSize)}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </Select>
        </label>

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">
            Page {page} sur {pageCount}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Page précédente"
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pageCount}
            aria-label="Page suivante"
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  )
}
