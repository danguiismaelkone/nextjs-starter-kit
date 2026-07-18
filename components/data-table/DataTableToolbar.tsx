"use client"

import { useRef, useState, type ChangeEvent } from "react"
import { Download, Loader2, Settings2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DataTableFilterChip } from "./DataTableFilterChip"
import { DataTableSearchChip } from "./DataTableSearchChip"
import { parseCsv } from "./csv"
import type { DataTableColumn, DataTableFilters, DataTableImportResult } from "./types"

interface DataTableToolbarProps<T> {
  columns: DataTableColumn<T>[]
  filters: DataTableFilters
  onFilterChange: (columnId: string, value: string | undefined) => void
  onClearFilters: () => void
  hiddenColumnIds: Set<string>
  onToggleColumnVisibility: (columnId: string) => void
  onExport?: () => void
  onImport?: (rows: Record<string, string>[]) => Promise<DataTableImportResult>
  importHint?: string
  /** Chip de recherche texte (ITEM-079) — même ligne que les chips de filtre. */
  enableSearch?: boolean
  search?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
}

/**
 * Barre filtres (gauche) + export/import/colonnes (droite) au-dessus de la
 * table (ITEM-076) — distincte du `toolbar` existant de `DataTable` (bouton
 * "Créer" au-dessus de tout, inchangé) pour ne pas perturber les
 * consommateurs déjà en place.
 */
export function DataTableToolbar<T>({
  columns,
  filters,
  onFilterChange,
  onClearFilters,
  hiddenColumnIds,
  onToggleColumnVisibility,
  onExport,
  onImport,
  importHint,
  enableSearch,
  search = "",
  onSearchChange,
  searchPlaceholder,
}: DataTableToolbarProps<T>) {
  const filterableColumns = columns.filter((column) => column.filterable)
  const hideableColumns = columns.filter((column) => column.hideable !== false)
  const hasActiveFilters = Object.keys(filters).length > 0 || !!search

  const [importOpen, setImportOpen] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<DataTableImportResult | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (fileInputRef.current) fileInputRef.current.value = ""
    if (!file || !onImport) return

    setImportError(null)
    setImportResult(null)
    setIsImporting(true)
    try {
      const text = await file.text()
      const rows = parseCsv(text)
      const result = await onImport(rows)
      setImportResult(result)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Échec de l'import.")
    } finally {
      setIsImporting(false)
    }
  }

  if (!enableSearch && filterableColumns.length === 0 && !onExport && !onImport && hideableColumns.length === 0) {
    return null
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {enableSearch && onSearchChange && (
            <DataTableSearchChip value={search} onChange={onSearchChange} placeholder={searchPlaceholder} />
          )}
          {filterableColumns.map((column) => (
            <DataTableFilterChip
              key={column.id}
              column={column}
              value={filters[column.id]}
              onChange={(value) => onFilterChange(column.id, value)}
            />
          ))}
          {hasActiveFilters && (
            <Button type="button" variant="link" size="sm" className="h-8 px-1 text-primary" onClick={onClearFilters}>
              Effacer les filtres
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onImport && (
            <Button type="button" variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" /> Importer
            </Button>
          )}
          {onExport && (
            <Button type="button" variant="outline" size="sm" onClick={onExport}>
              <Download className="h-4 w-4" /> Exporter
            </Button>
          )}
          {hideableColumns.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  <Settings2 className="h-4 w-4" /> Modifier les colonnes
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Colonnes affichées</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {hideableColumns.map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={!hiddenColumnIds.has(column.id)}
                    onCheckedChange={() => onToggleColumnVisibility(column.id)}
                    onSelect={(event) => event.preventDefault()}
                  >
                    {column.label ?? column.id}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {onImport && (
        <Dialog
          open={importOpen}
          onOpenChange={(open) => {
            setImportOpen(open)
            if (!open) {
              setImportError(null)
              setImportResult(null)
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Importer un fichier CSV</DialogTitle>
              {importHint && <DialogDescription>{importHint}</DialogDescription>}
            </DialogHeader>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileSelected}
              disabled={isImporting}
            />

            {isImporting && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Import en cours...
              </p>
            )}
            {importError && (
              <p role="alert" className="text-sm text-destructive">
                {importError}
              </p>
            )}
            {importResult && (
              <div className="text-sm">
                <p>{importResult.successCount} ligne(s) importée(s).</p>
                {importResult.errors.length > 0 && (
                  <ul className="mt-1 list-disc pl-4 text-destructive">
                    {importResult.errors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setImportOpen(false)}>
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
