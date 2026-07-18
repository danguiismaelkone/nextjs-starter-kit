/**
 * CSV minimal, sans dépendance (ITEM-076) — export des données affichées par
 * `DataTable` et import générique consommé par `onImport`. Volontairement
 * simple (RFC 4180 de base : guillemets, virgules, retours à la ligne dans un
 * champ) plutôt qu'une bibliothèque complète, cohérent avec le CSV déjà
 * construit à la main ailleurs dans ce repo (ITEM-067, export du journal
 * d'audit).
 */

function escapeCsvValue(value: string): string {
  if (!/[",\n]/.test(value)) return value
  return `"${value.replace(/"/g, '""')}"`
}

export function buildCsv(headers: string[], rows: string[][]): string {
  const lines = [headers.map(escapeCsvValue).join(",")]
  for (const row of rows) {
    lines.push(row.map(escapeCsvValue).join(","))
  }
  return lines.join("\r\n")
}

/** Déclenche le téléchargement d'un fichier texte dans le navigateur. */
export function downloadTextFile(filename: string, content: string, mimeType = "text/csv;charset=utf-8"): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * Parseur CSV minimal (guillemets doublés `""`, champs entre guillemets
 * pouvant contenir virgules/retours à la ligne) — retourne une ligne par
 * enregistrement, clés = première ligne (en-têtes).
 */
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
      continue
    }

    if (char === '"') {
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

  const nonEmptyRows = rows.filter((r) => !(r.length === 1 && r[0] === ""))
  if (nonEmptyRows.length === 0) return []

  const [headerRow, ...dataRows] = nonEmptyRows
  const headers = headerRow.map((header) => header.trim())

  return dataRows.map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, (values[index] ?? "").trim()]))
  )
}
