import { describe, it, expect } from "vitest"
import { buildCsv, parseCsv } from "./csv"

describe("buildCsv", () => {
  it("construit un CSV simple avec en-têtes et lignes", () => {
    const csv = buildCsv(["Nom", "E-mail"], [
      ["Alice", "alice@example.com"],
      ["Bob", "bob@example.com"],
    ])
    expect(csv).toBe("Nom,E-mail\r\nAlice,alice@example.com\r\nBob,bob@example.com")
  })

  it("échappe les valeurs contenant une virgule, un guillemet ou un retour à la ligne", () => {
    const csv = buildCsv(["Nom"], [['Doe, "John"'], ["Ligne1\nLigne2"]])
    expect(csv).toBe('Nom\r\n"Doe, ""John"""\r\n"Ligne1\nLigne2"')
  })
})

describe("parseCsv", () => {
  it("parse un CSV simple en tableau d'objets (clés = en-têtes)", () => {
    const rows = parseCsv("name,email\nAlice,alice@example.com\nBob,bob@example.com")
    expect(rows).toEqual([
      { name: "Alice", email: "alice@example.com" },
      { name: "Bob", email: "bob@example.com" },
    ])
  })

  it("gère les champs entre guillemets contenant une virgule", () => {
    const rows = parseCsv('name,city\n"Doe, John",Paris')
    expect(rows).toEqual([{ name: "Doe, John", city: "Paris" }])
  })

  it("gère les guillemets doublés à l'intérieur d'un champ échappé", () => {
    const rows = parseCsv('name\n"Il a dit ""bonjour"""')
    expect(rows).toEqual([{ name: 'Il a dit "bonjour"' }])
  })

  it("gère les fins de ligne CRLF", () => {
    const rows = parseCsv("name,email\r\nAlice,alice@example.com\r\n")
    expect(rows).toEqual([{ name: "Alice", email: "alice@example.com" }])
  })

  it("retourne un tableau vide pour une entrée vide", () => {
    expect(parseCsv("")).toEqual([])
  })

  it("retourne un tableau vide quand seuls les en-têtes sont présents", () => {
    expect(parseCsv("name,email")).toEqual([])
  })
})
