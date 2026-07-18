"use server"

import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireOrganization } from "@/lib/organization"
import { hasPermission } from "@/lib/permissions"
import { logAudit } from "@/lib/audit"
import { rolePermissionToggleSchema } from "@/lib/validators/organization"

export interface ToggleResult {
  error?: string
}

/**
 * Accorde ou révoque une permission pour un rôle (ITEM-019). Chaque
 * changement est appliqué immédiatement en base (pas de brouillon/validation
 * séparée) et journalisé dans `AuditLog` (fondation ITEM-051).
 */
export async function toggleRolePermissionAction(
  roleId: string,
  permissionId: string,
  granted: boolean
): Promise<ToggleResult> {
  const session = await getSession()
  if (!session?.user) return { error: "Session introuvable." }

  const parsed = rolePermissionToggleSchema.safeParse({ roleId, permissionId, granted })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Requête invalide." }
  }

  const organization = await requireOrganization()

  const allowed = await hasPermission(session.user.id, organization.id, "admin", "access")
  if (!allowed) return { error: "Vous n'avez pas les droits pour modifier les rôles." }

  const role = await prisma.role.findFirst({ where: { id: roleId, organizationId: organization.id } })
  if (!role) return { error: "Rôle introuvable." }

  const permission = await prisma.permission.findUnique({ where: { id: permissionId } })
  if (!permission) return { error: "Permission introuvable." }

  if (granted) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId, permissionId } },
      create: { roleId, permissionId },
      update: {},
    })
  } else {
    await prisma.rolePermission.deleteMany({ where: { roleId, permissionId } })
  }

  await logAudit({
    organizationId: organization.id,
    actorId: session.user.id,
    action: granted ? "role.permission.granted" : "role.permission.revoked",
    targetType: "Role",
    targetId: roleId,
    metadata: { resource: permission.resource, action: permission.action },
  })

  revalidatePath(`/roles/${roleId}`)
  return {}
}
