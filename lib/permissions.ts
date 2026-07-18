import { prisma } from "@/lib/prisma"

export const SYSTEM_ROLES = [
  { key: "owner", name: "Owner" },
  { key: "admin", name: "Admin" },
  { key: "member", name: "Member" },
] as const

/** Permissions accordées à chaque rôle système par défaut, à la création d'une organisation. */
const DEFAULT_ROLE_PERMISSIONS: Record<string, Array<{ resource: string; action: string }>> = {
  owner: [{ resource: "admin", action: "access" }],
  admin: [{ resource: "admin", action: "access" }],
  member: [],
}

/**
 * Crée les rôles système (owner/admin/member) d'une organisation avec leurs
 * permissions par défaut (ITEM-018). Appelé à la création d'une organisation
 * (`createOrganizationWithOwner`, `lib/organization.ts`) ; idempotent (upsert)
 * pour pouvoir être rejoué sans dupliquer.
 */
export async function seedSystemRoles(organizationId: string): Promise<void> {
  for (const { key, name } of SYSTEM_ROLES) {
    const role = await prisma.role.upsert({
      where: { organizationId_key: { organizationId, key } },
      create: { organizationId, key, name, isSystem: true },
      update: {},
    })

    for (const { resource, action } of DEFAULT_ROLE_PERMISSIONS[key] ?? []) {
      const permission = await prisma.permission.upsert({
        where: { resource_action: { resource, action } },
        create: { resource, action },
        update: {},
      })

      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        create: { roleId: role.id, permissionId: permission.id },
        update: {},
      })
    }
  }
}

/**
 * Vérifie qu'un utilisateur a la permission `resource:action` dans une
 * organisation donnée, via le `Role` système correspondant à son
 * `Membership.role` ("owner" | "admin" | "member") dans cette organisation.
 */
export async function hasPermission(
  userId: string,
  organizationId: string,
  resource: string,
  action: string
): Promise<boolean> {
  const membership = await prisma.membership.findFirst({
    where: { userId, organizationId, status: "active" },
  })
  if (!membership) return false

  const role = await prisma.role.findUnique({
    where: { organizationId_key: { organizationId, key: membership.role } },
    include: { permissions: { include: { permission: true } } },
  })
  if (!role) return false

  return role.permissions.some((rp) => rp.permission.resource === resource && rp.permission.action === action)
}
