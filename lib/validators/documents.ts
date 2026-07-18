import { z } from "zod"
import { SHARE_ACCESS_LEVELS, SHARE_VISIBILITIES } from "@/lib/shares"

const MAX_EXPIRES_IN_DAYS = 365
const MAX_NAME_LENGTH = 150
const MAX_DESCRIPTION_LENGTH = 2000

export const nullableFolderIdValue = z
  .union([z.string().trim().min(1), z.literal(""), z.null()])
  .transform((value) => (value ? value : null))

export const moveDocumentSchema = z.object({
  // Clé requise (contrairement à `generateDocumentSchema`) — le corps doit exprimer
  // explicitement une destination (dossier ou racine), comme avant l'introduction de Zod.
  folderId: nullableFolderIdValue,
})

export const createShareSchema = z.object({
  accessLevel: z.enum(SHARE_ACCESS_LEVELS, { message: "Niveau d'accès invalide." }),
  visibility: z.enum(SHARE_VISIBILITIES, { message: "Visibilité invalide." }),
  expiresInDays: z
    .union([z.number(), z.null(), z.undefined()])
    .refine((value) => value === null || value === undefined || (Number.isFinite(value) && value > 0 && value <= MAX_EXPIRES_IN_DAYS), {
      message: "Durée d'expiration invalide.",
    })
    .optional(),
})

const DOCUMENT_TYPES = ["contract", "report", "letter", "note", "other"] as const

export const generateDocumentSchema = z.object({
  name: z.string().trim().min(1, "Le titre du document est requis.").max(MAX_NAME_LENGTH, "Le titre est trop long."),
  documentType: z.enum(DOCUMENT_TYPES, { message: "Type de document invalide." }),
  description: z
    .string()
    .trim()
    .min(1, "La description est requise.")
    .max(MAX_DESCRIPTION_LENGTH, "La description est trop longue."),
  folderId: nullableFolderIdValue.optional(),
})

export const searchDocumentsQuerySchema = z.object({
  q: z.string().trim().optional().default(""),
})
