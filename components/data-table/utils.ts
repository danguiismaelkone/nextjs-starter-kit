import type {
  ColumnDef,
  FilterState,
  FilterValue,
  SortState,
} from "./types"

/** Reads a (possibly dotted) key from a row, e.g. `getCellValue(o, "a.b")`. */
export function getCellValue<T>(row: T, key: string): unknown {
  return key.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object") {
      return (acc as Record<string, unknown>)[part]
    }
    return undefined
  }, row)
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" })

export function formatDate(value: unknown): string {
  const d = toDate(value)
  return d ? dateFormatter.format(d) : "—"
}

export function formatCurrency(value: unknown, currency = "EUR"): string {
  const n = typeof value === "number" ? value : Number(value)
  if (Number.isNaN(n)) return "—"
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(
    n,
  )
}

/** Total ordering used by sorting: nulls last, then dates/numbers/strings. */
function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1

  const da = toDate(a)
  const db = toDate(b)
  if (da && db && (a instanceof Date || b instanceof Date)) {
    return da.getTime() - db.getTime()
  }

  if (typeof a === "number" && typeof b === "number") return a - b

  return String(a).localeCompare(String(b), "fr", { sensitivity: "base" })
}

export function sortData<T>(data: T[], sort: SortState): T[] {
  if (!sort) return data
  const sorted = [...data].sort((a, b) =>
    compareValues(getCellValue(a, sort.key), getCellValue(b, sort.key)),
  )
  return sort.direction === "asc" ? sorted : sorted.reverse()
}

function matchesFilter(raw: unknown, filter: FilterValue): boolean {
  switch (filter.type) {
    case "text": {
      const needle = filter.value.trim().toLowerCase()
      if (!needle) return true
      return String(raw ?? "")
        .toLowerCase()
        .includes(needle)
    }
    case "badge": {
      if (filter.values.length === 0) return true
      return filter.values.includes(String(raw ?? ""))
    }
    case "date": {
      const d = toDate(raw)
      if (!d) return false
      if (filter.from) {
        const from = toDate(filter.from)
        if (from && d.getTime() < from.setHours(0, 0, 0, 0)) return false
      }
      if (filter.to) {
        const to = toDate(filter.to)
        if (to && d.getTime() > to.setHours(23, 59, 59, 999)) return false
      }
      return true
    }
    case "currency": {
      const n = typeof raw === "number" ? raw : Number(raw)
      if (Number.isNaN(n)) return false
      switch (filter.operator) {
        case "=":
          return n === filter.amount
        case ">":
          return n > filter.amount
        case ">=":
          return n >= filter.amount
        case "<":
          return n < filter.amount
        case "<=":
          return n <= filter.amount
      }
    }
  }
}

export function filterData<T>(data: T[], filters: FilterState): T[] {
  const active = Object.entries(filters)
  if (active.length === 0) return data
  return data.filter((row) =>
    active.every(([key, filter]) => matchesFilter(getCellValue(row, key), filter)),
  )
}

/** True when a filter holds a meaningful (non-empty) constraint. */
export function isFilterActive(filter: FilterValue | undefined): boolean {
  if (!filter) return false
  switch (filter.type) {
    case "text":
      return filter.value.trim().length > 0
    case "badge":
      return filter.values.length > 0
    case "date":
      return Boolean(filter.from || filter.to)
    case "currency":
      return !Number.isNaN(filter.amount)
  }
}

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/** Serialises the given rows to CSV using the visible columns' labels. */
export function toCsv<T>(columns: ColumnDef<T>[], rows: T[]): string {
  const header = columns.map((c) => escapeCsv(c.label)).join(",")
  const body = rows.map((row) =>
    columns
      .map((c) => {
        const raw = getCellValue(row, c.key)
        let cell: string
        if (c.type === "date") cell = formatDate(raw)
        else if (c.type === "badge")
          cell = c.badgeMap?.[String(raw)]?.label ?? String(raw ?? "")
        else cell = raw == null ? "" : String(raw)
        return escapeCsv(cell)
      })
      .join(","),
  )
  return [header, ...body].join("\n")
}

/** Triggers a client-side download of a CSV string. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/** Minimal CSV parser (handles quotes, commas, newlines) → array of records. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let field = ""
  let row: string[] = []
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ",") {
      row.push(field)
      field = ""
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++
      row.push(field)
      rows.push(row)
      field = ""
      row = []
    } else {
      field += char
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  const [header, ...dataRows] = rows.filter((r) => r.some((c) => c.length > 0))
  if (!header) return []
  return dataRows.map((r) =>
    Object.fromEntries(header.map((h, idx) => [h, r[idx] ?? ""])),
  )
}
