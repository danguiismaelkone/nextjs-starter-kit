import { z } from "zod"

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/

/**
 * `<input type="date">` envoie une date sans heure (`2026-07-17`) — pour que
 * `to` reste inclusif du jour choisi (au lieu de s'arrêter à minuit pile),
 * une date seule est ramenée à la fin de journée UTC côté `to`, au début
 * côté `from`. Une valeur avec heure explicite (export programmatique) est
 * conservée telle quelle.
 */
function dateBoundarySchema(edge: "start" | "end") {
  return z
    .string()
    .trim()
    .refine((value) => !Number.isNaN(Date.parse(value)), "Date invalide.")
    .transform((value) => {
      if (DATE_ONLY_REGEX.test(value)) {
        return new Date(`${value}T${edge === "start" ? "00:00:00.000" : "23:59:59.999"}Z`)
      }
      return new Date(value)
    })
}

export const auditExportQuerySchema = z
  .object({
    from: dateBoundarySchema("start").optional(),
    to: dateBoundarySchema("end").optional(),
    format: z.enum(["csv", "json"]).default("csv"),
  })
  .refine((data) => !data.from || !data.to || data.from.getTime() <= data.to.getTime(), {
    message: "La date de début doit précéder la date de fin.",
    path: ["from"],
  })
