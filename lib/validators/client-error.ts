import { z } from "zod"

const MAX_FIELD_LENGTH = 4000

export const clientErrorSchema = z.object({
  message: z.string().trim().min(1).max(MAX_FIELD_LENGTH),
  stack: z.string().max(MAX_FIELD_LENGTH).optional(),
  digest: z.string().max(200).optional(),
})
