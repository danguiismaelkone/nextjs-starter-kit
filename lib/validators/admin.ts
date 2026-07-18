import { z } from "zod"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const MIN_PASSWORD_LENGTH = 8
const VALID_ROLES = ["user", "admin"] as const

export const emailSchema = z.string().trim().regex(EMAIL_REGEX, "Adresse e-mail invalide.")
export const roleSchema = z.enum(VALID_ROLES, { message: "Rôle invalide." })
export const nameSchema = z.string().trim().min(1, "Le nom est requis.")

export const createInvitationSchema = z.object({
  email: emailSchema,
  role: roleSchema.optional().default("user"),
})

export const createUserSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: z.string().min(MIN_PASSWORD_LENGTH, `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`),
  role: roleSchema.optional().default("user"),
})
