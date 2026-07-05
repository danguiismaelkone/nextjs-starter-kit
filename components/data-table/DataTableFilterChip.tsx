"use client"

import * as React from "react"
import { Plus, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type { ColumnDef, FilterValue } from "./types"
import { isFilterActive } from "./utils"

/** Short human-readable summary of an active filter, shown on the chip. */
function summarise<T>(col: ColumnDef<T>, filter: FilterValue): string {
  switch (filter.type) {
    case "text":
      return filter.value
    case "badge":
      return filter.values
        .map((v) => col.badgeMap?.[v]?.label ?? v)
        .join(", ")
    case "date":
      return [filter.from, filter.to].filter(Boolean).join(" → ")
    case "currency":
      return `${filter.operator} ${filter.amount}`
  }
}

export function DataTableFilterChip<T>({
  column,
  value,
  onApply,
  onClear,
}: {
  column: ColumnDef<T>
  value: FilterValue | undefined
  onApply: (filter: FilterValue) => void
  onClear: () => void
}) {
  const [open, setOpen] = React.useState(false)
  const active = isFilterActive(value)

  function handleApply(filter: FilterValue) {
    onApply(filter)
    setOpen(false)
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border text-sm",
        active ? "border-primary/40 bg-primary/5" : "border-dashed",
      )}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-full py-1 pl-3 pr-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            {!active ? <Plus className="size-3.5" /> : null}
            <span className="font-medium text-foreground">{column.label}</span>
            {active && value ? (
              <span className="max-w-40 truncate text-foreground/70">
                {summarise(column, value)}
              </span>
            ) : null}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64">
          <FilterEditor
            column={column}
            value={value}
            onApply={handleApply}
          />
        </PopoverContent>
      </Popover>
      {active ? (
        <button
          type="button"
          onClick={onClear}
          aria-label={`Effacer le filtre ${column.label}`}
          className="mr-1 flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  )
}

function FilterEditor<T>({
  column,
  value,
  onApply,
}: {
  column: ColumnDef<T>
  value: FilterValue | undefined
  onApply: (filter: FilterValue) => void
}) {
  if (column.type === "badge") {
    return <BadgeFilter column={column} value={value} onApply={onApply} />
  }
  if (column.type === "date") {
    return <DateFilter value={value} onApply={onApply} />
  }
  if (column.type === "currency") {
    return <CurrencyFilter value={value} onApply={onApply} />
  }
  return <TextFilter column={column} value={value} onApply={onApply} />
}

function TextFilter<T>({
  column,
  value,
  onApply,
}: {
  column: ColumnDef<T>
  value: FilterValue | undefined
  onApply: (filter: FilterValue) => void
}) {
  const [text, setText] = React.useState(
    value?.type === "text" ? value.value : "",
  )
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        onApply({ type: "text", value: text })
      }}
    >
      <Label htmlFor={`filter-${column.key}`}>{column.label}</Label>
      <Input
        id={`filter-${column.key}`}
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Contient…"
      />
      <Button type="submit" size="sm">
        Appliquer
      </Button>
    </form>
  )
}

function BadgeFilter<T>({
  column,
  value,
  onApply,
}: {
  column: ColumnDef<T>
  value: FilterValue | undefined
  onApply: (filter: FilterValue) => void
}) {
  const [selected, setSelected] = React.useState<string[]>(
    value?.type === "badge" ? value.values : [],
  )
  const options = Object.entries(column.badgeMap ?? {})

  function toggle(key: string, checked: boolean) {
    setSelected((prev) =>
      checked ? [...prev, key] : prev.filter((v) => v !== key),
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {options.map(([key, conf]) => (
          <label
            key={key}
            className="flex items-center gap-2 text-sm"
          >
            <Checkbox
              checked={selected.includes(key)}
              onCheckedChange={(v) => toggle(key, v === true)}
            />
            {conf.label}
          </label>
        ))}
      </div>
      <Button
        type="button"
        size="sm"
        onClick={() => onApply({ type: "badge", values: selected })}
      >
        Appliquer
      </Button>
    </div>
  )
}

function DateFilter({
  value,
  onApply,
}: {
  value: FilterValue | undefined
  onApply: (filter: FilterValue) => void
}) {
  const [from, setFrom] = React.useState(
    value?.type === "date" ? (value.from ?? "") : "",
  )
  const [to, setTo] = React.useState(
    value?.type === "date" ? (value.to ?? "") : "",
  )
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        onApply({ type: "date", from: from || undefined, to: to || undefined })
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-from">Du</Label>
        <Input
          id="filter-from"
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-to">Au</Label>
        <Input
          id="filter-to"
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </div>
      <Button type="submit" size="sm">
        Appliquer
      </Button>
    </form>
  )
}

function CurrencyFilter({
  value,
  onApply,
}: {
  value: FilterValue | undefined
  onApply: (filter: FilterValue) => void
}) {
  const [operator, setOperator] = React.useState<
    "=" | ">" | ">=" | "<" | "<="
  >(value?.type === "currency" ? value.operator : ">=")
  const [amount, setAmount] = React.useState(
    value?.type === "currency" ? String(value.amount) : "",
  )
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        onApply({ type: "currency", operator, amount: Number(amount) })
      }}
    >
      <div className="flex gap-2">
        <Select
          className="w-20"
          value={operator}
          onChange={(e) =>
            setOperator(e.target.value as "=" | ">" | ">=" | "<" | "<=")
          }
        >
          {["=", ">", ">=", "<", "<="].map((op) => (
            <option key={op} value={op}>
              {op}
            </option>
          ))}
        </Select>
        <Input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Montant"
        />
      </div>
      <Button type="submit" size="sm">
        Appliquer
      </Button>
    </form>
  )
}
