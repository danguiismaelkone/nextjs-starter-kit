"use client"

import { useState } from "react"
import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DataTableSearchChipProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

/**
 * Chip de recherche texte (ITEM-079) — même ligne et même style que les chips
 * de filtre par colonne (`DataTableFilterChip`), mais ne cible aucune colonne
 * précise : la valeur porte sur plusieurs champs à la fois côté serveur (ex.
 * nom + e-mail), transmise via `DataTableFetchContext.search`.
 */
export function DataTableSearchChip({ value, onChange, placeholder = "Rechercher" }: DataTableSearchChipProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)
  const isActive = !!value

  function apply(nextValue: string) {
    onChange(nextValue.trim())
    setOpen(false)
  }

  return (
    <div className="inline-flex items-center">
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (next) setDraft(value)
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={isActive ? "rounded-r-none border-primary/50 text-primary" : "border-dashed text-muted-foreground"}
          >
            <Search className="h-3.5 w-3.5" />
            {isActive ? <span className="font-medium text-foreground">{value}</span> : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <div className="flex gap-2">
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={placeholder}
              onKeyDown={(event) => {
                if (event.key === "Enter") apply(draft)
              }}
              autoFocus
            />
            <Button type="button" size="sm" onClick={() => apply(draft)}>
              OK
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      {isActive && (
        <button
          type="button"
          aria-label="Effacer la recherche"
          onClick={() => onChange("")}
          className="flex h-8 items-center rounded-r-lg border border-l-0 border-primary/50 px-1.5 text-primary hover:bg-muted"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
