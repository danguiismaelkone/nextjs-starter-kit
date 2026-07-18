import { z } from "zod"

const MAX_NAME_LENGTH = 100

const folderName = z.string().trim().min(1, "Nom de dossier invalide.").max(MAX_NAME_LENGTH, "Nom de dossier invalide.")
const nullableParentId = z
  .union([z.string().trim().min(1), z.literal(""), z.null()])
  .transform((value) => (value ? value : null))

export const createFolderSchema = z.object({
  name: folderName,
  parentId: nullableParentId.optional(),
})

// Chaque champ est indépendamment optionnel (mise à jour partielle) — sa présence
// dans le corps déclenche sa validation et son application (voir la route PATCH).
export const updateFolderSchema = z.object({
  name: folderName.optional(),
  parentId: nullableParentId.optional(),
})
