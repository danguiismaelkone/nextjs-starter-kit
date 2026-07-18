"use client"

import { Button } from "@/components/ui/button"

interface DataTablePaginationProps {
  page: number
  totalPages: number
  total: number
  disabled?: boolean
  onPageChange: (page: number) => void
}

/**
 * Résumé + navigation de pagination (ITEM-076) — le résumé (« Page X/Y · Z
 * éléments ») reste toujours visible, même sur une seule page (ITEM-079,
 * retour utilisateur : la pagination disparaissait entièrement dès qu'il n'y
 * avait rien à paginer, y compris le compte total). Seuls les boutons
 * Précédent/Suivant sont désactivés quand il n'y a rien vers quoi naviguer.
 */
export function DataTablePagination({ page, totalPages, total, disabled, onPageChange }: DataTablePaginationProps) {
  return (
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      <span>
        Page {page} / {totalPages} · {total} élément{total > 1 ? "s" : ""}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1 || disabled} onClick={() => onPageChange(page - 1)}>
          Précédent
        </Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages || disabled} onClick={() => onPageChange(page + 1)}>
          Suivant
        </Button>
      </div>
    </div>
  )
}
