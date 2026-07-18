"use client"

import { useState } from "react"
import { Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { DataTableColumn } from "./types"

interface DataTableFilterChipProps<T> {
  column: DataTableColumn<T>
  value: string | undefined
  onChange: (value: string | undefined) => void
}

/**
 * Chip de filtre par colonne (ITEM-076) — inactif : « ⊕ Libellé », clic ouvre
 * un popover pour choisir une valeur. Actif : « Libellé : valeur » + un bouton
 * de retrait séparé du déclencheur du popover (évite un élément interactif
 * imbriqué dans un autre).
 */
export function DataTableFilterChip<T>({ column, value, onChange }: DataTableFilterChipProps<T>) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value ?? "")
  const label = column.label ?? column.id
  const isActive = !!value
  const activeOption = column.filterType === "select" ? column.filterOptions?.find((option) => option.value === value) : undefined

  function apply(nextValue: string) {
    onChange(nextValue.trim() ? nextValue : undefined)
    setOpen(false)
  }

  return (
    <div className="inline-flex items-center">
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (next) setDraft(value ?? "")
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={isActive ? "rounded-r-none border-primary/50 text-primary" : "border-dashed text-muted-foreground"}
          >
            {isActive ? (
              <>
                {label} : <span className="font-medium text-foreground">{activeOption?.label ?? value}</span>
              </>
            ) : (
              <>
                <Plus className="mr-1 h-3.5 w-3.5" /> {label}
              </>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <div className="flex flex-col gap-3">
            <Label>{label}</Label>
            {column.filterType === "select" && column.filterOptions ? (
              <div className="flex flex-col gap-1">
                {column.filterOptions.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={value === option.value ? "secondary" : "ghost"}
                    size="sm"
                    className="justify-start"
                    onClick={() => apply(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={`Filtrer par ${label.toLowerCase()}`}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") apply(draft)
                  }}
                  autoFocus
                />
                <Button type="button" size="sm" onClick={() => apply(draft)}>
                  OK
                </Button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
      {isActive && (
        <button
          type="button"
          aria-label={`Retirer le filtre ${label}`}
          onClick={() => onChange(undefined)}
          className="flex h-8 items-center rounded-r-lg border border-l-0 border-primary/50 px-1.5 text-primary hover:bg-muted"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
