import { z } from "zod"

const MAX_MESSAGE_LENGTH = 4000
const MAX_PROMPT_LENGTH = 2000
const MAX_CONTEXT_LENGTH = 2000

export const chatMessageSchema = z.object({
  message: z.string().trim().min(1, "Message vide.").max(MAX_MESSAGE_LENGTH, "Message trop long."),
})

export const generateTextSchema = z.object({
  prompt: z.string().trim().min(1, "Instruction vide.").max(MAX_PROMPT_LENGTH, "Instruction trop longue."),
  context: z.string().trim().max(MAX_CONTEXT_LENGTH, "Contexte trop long.").optional().default(""),
})

export const documentIdSchema = z.object({
  documentId: z.string().trim().min(1, "Document invalide."),
})
