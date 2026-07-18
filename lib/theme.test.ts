import { describe, it, expect } from "vitest"
import { buildBrandingStyle, isValidFontFamily } from "@/lib/theme"

describe("isValidFontFamily", () => {
  it("accepte une pile de polices classique", () => {
    expect(isValidFontFamily("Georgia, 'Times New Roman', serif")).toBe(true)
  })

  it("refuse une valeur contenant des caractères hors propriété CSS (ex. tentative d'échappement)", () => {
    expect(isValidFontFamily("Arial; } body { display: none")).toBe(false)
  })

  it("refuse une chaîne vide", () => {
    expect(isValidFontFamily("")).toBe(false)
  })
})

describe("buildBrandingStyle", () => {
  it("retourne undefined sans couleur ni police", () => {
    expect(buildBrandingStyle(null, null)).toBeUndefined()
  })

  it("ignore une couleur invalide", () => {
    expect(buildBrandingStyle("not-a-color", null)).toBeUndefined()
  })

  it("pose --primary/--primary-foreground pour une couleur valide", () => {
    const style = buildBrandingStyle("#0f172a", null)
    expect(style).toMatchObject({ "--primary": "#0f172a" })
    expect(style?.["--primary-foreground" as keyof typeof style]).toBeDefined()
  })

  it("pose --font-sans pour une police valide, indépendamment de la couleur", () => {
    const style = buildBrandingStyle(null, "Georgia, serif")
    expect(style).toEqual({ "--font-sans": "Georgia, serif" })
  })

  it("ignore une police invalide", () => {
    expect(buildBrandingStyle(null, "Arial; } body { display: none")).toBeUndefined()
  })

  it("combine couleur et police quand les deux sont valides", () => {
    const style = buildBrandingStyle("#0f172a", "Georgia, serif")
    expect(style).toMatchObject({ "--primary": "#0f172a", "--font-sans": "Georgia, serif" })
  })
})
