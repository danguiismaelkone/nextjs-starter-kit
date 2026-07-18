import type { z } from "zod"

export type ValidationResult<T> = { success: true; data: T } | { success: false; message: string }

function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Requête invalide."
}

/** Body JSON validé par un schéma Zod (ITEM-055) — `success: false` si absent/invalide. */
export async function parseJsonBody<T>(request: Request, schema: z.ZodType<T>): Promise<ValidationResult<T>> {
  const body = await request.json().catch(() => null)
  const result = schema.safeParse(body)
  if (!result.success) {
    return { success: false, message: firstIssueMessage(result.error) }
  }
  return { success: true, data: result.data }
}

/** Paramètres de recherche (`URL.searchParams`) validés par un schéma Zod (ITEM-055). */
export function parseSearchParams<T>(url: string, schema: z.ZodType<T>): ValidationResult<T> {
  const searchParams = Object.fromEntries(new URL(url).searchParams)
  const result = schema.safeParse(searchParams)
  if (!result.success) {
    return { success: false, message: firstIssueMessage(result.error) }
  }
  return { success: true, data: result.data }
}

/** `FormData` d'une Server Action validée par un schéma Zod (ITEM-055). */
export function parseFormData<T>(formData: FormData, schema: z.ZodType<T>): ValidationResult<T> {
  const result = schema.safeParse(Object.fromEntries(formData))
  if (!result.success) {
    return { success: false, message: firstIssueMessage(result.error) }
  }
  return { success: true, data: result.data }
}

/**
 * Regroupe les erreurs Zod par champ (`{ [nom_du_champ]: premier_message }`) —
 * pour les Server Actions qui affichent une erreur par champ de formulaire
 * (`useActionState`, ITEM-055) plutôt qu'un message global unique.
 */
export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_")
    if (!(key in fieldErrors)) fieldErrors[key] = issue.message
  }
  return fieldErrors
}
