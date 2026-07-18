"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/authorization"
import { requireOrganization, slugify } from "@/lib/organization"
import { isEnterpriseOrganization } from "@/lib/billing"
import { logAudit } from "@/lib/audit"
import { zodFieldErrors } from "@/lib/validation"
import { createRoleSchema } from "@/lib/validators/organization"

export interface ActionState {
  success?: boolean
  formError?: string
  fieldErrors?: Record<string, string>
}

/**
 * Dérive une `Role.key` unique pour l'organisation à partir du nom saisi —
 * même stratégie de désambiguïsation que `createOrganizationWithOwner` (slug
 * + suffixe numérique en cas de collision), pour ne jamais entrer en
 * conflit avec les clés système (`owner`/`admin`/`member`) ou un rôle custom
 * déjà créé.
 */
async function uniqueRoleKey(organizationId: string, name: string): Promise<string> {
  const baseKey = slugify(name)
  let key = baseKey
  let suffix = 1
  while (await prisma.role.findUnique({ where: { organizationId_key: { organizationId, key } } })) {
    suffix += 1
    key = `${baseKey}-${suffix}`
  }
  return key
}

/**
 * Crée un rôle personnalisé (ITEM-066) — réservé aux organisations sur le
 * plan Enterprise, vérifié ici côté serveur (pas seulement caché dans l'UI)
 * en plus du droit `admin:access` déjà requis pour `/roles`. Créé sans
 * permission : l'admin les accorde ensuite depuis `/roles/[id]`
 * (`PermissionMatrix`, ITEM-019), qui couvre déjà le choix d'un sous-ensemble
 * arbitraire de permissions.
 */
export async function createRoleAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdmin()
  const organization = await requireOrganization()

  const enterprise = await isEnterpriseOrganization(organization.id)
  if (!enterprise) {
    return { formError: "Les rôles personnalisés sont réservés aux organisations sur le plan Enterprise." }
  }

  const parsed = createRoleSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { fieldErrors: zodFieldErrors(parsed.error) }
  }
  const { name } = parsed.data

  const key = await uniqueRoleKey(organization.id, name)

  const role = await prisma.role.create({
    data: { organizationId: organization.id, key, name, isSystem: false },
  })

  await logAudit({
    organizationId: organization.id,
    actorId: session.user.id,
    action: "role.created",
    targetType: "Role",
    targetId: role.id,
    metadata: { name },
  })

  revalidatePath("/roles")
  return { success: true }
}
