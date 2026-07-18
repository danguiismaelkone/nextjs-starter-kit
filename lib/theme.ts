import type { CSSProperties } from "react"

export const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/

export function isValidHexColor(value: string): boolean {
  return HEX_COLOR_REGEX.test(value)
}

/**
 * Noir ou blanc selon la luminance relative de `hex` (WCAG), pour garder le
 * texte lisible sur un fond `--primary` de couleur arbitraire.
 */
export function getContrastingForeground(hex: string): "#000000" | "#ffffff" {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const [rl, gl, bl] = [r, g, b].map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  const luminance = 0.2126 * rl + 0.7152 * gl + 0.0722 * bl

  return luminance > 0.5 ? "#000000" : "#ffffff"
}

/**
 * `font-family` CSS à peu près bien formée — assez permissif pour couvrir de
 * vraies valeurs (`Georgia, 'Times New Roman', serif`) sans autoriser les
 * caractères qui n'ont aucun sens dans cette propriété (défense en
 * profondeur : cette valeur est déjà validée à l'écriture par
 * `lib/validators/organization.ts`, ce garde-fou est redondant mais peu
 * coûteux, même principe que `isValidHexColor` pour `primaryColor`).
 */
const FONT_FAMILY_REGEX = /^[a-zA-Z0-9\s,'"-]{1,150}$/

export function isValidFontFamily(value: string): boolean {
  return FONT_FAMILY_REGEX.test(value)
}

/**
 * Surcharge `--primary`/`--primary-foreground`/`--font-sans` (ITEM-049,
 * ITEM-069) — ne touche à aucune autre variable shadcn, donc le thème
 * clair/sombre (`--background`, `--card`, etc.) reste intact. `undefined`
 * quand l'organisation n'a personnalisé ni l'une ni l'autre : le thème par
 * défaut s'applique sans modification.
 */
export function buildBrandingStyle(
  primaryColor: string | null | undefined,
  fontFamily?: string | null
): CSSProperties | undefined {
  const style: Record<string, string> = {}

  if (primaryColor && isValidHexColor(primaryColor)) {
    style["--primary"] = primaryColor
    style["--primary-foreground"] = getContrastingForeground(primaryColor)
  }

  if (fontFamily && isValidFontFamily(fontFamily)) {
    style["--font-sans"] = fontFamily
  }

  return Object.keys(style).length > 0 ? (style as CSSProperties) : undefined
}
