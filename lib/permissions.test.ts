import { describe, it, expect, vi, beforeEach } from "vitest"

const prismaMock = {
  membership: { findFirst: vi.fn() },
  role: { findUnique: vi.fn(), upsert: vi.fn() },
  permission: { upsert: vi.fn() },
  rolePermission: { upsert: vi.fn() },
}

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))

const { hasPermission, seedSystemRoles, SYSTEM_ROLES } = await import("@/lib/permissions")

beforeEach(() => {
  vi.clearAllMocks()
})

describe("hasPermission", () => {
  it("refuse un utilisateur sans adhésion active à l'organisation", async () => {
    prismaMock.membership.findFirst.mockResolvedValue(null)

    const allowed = await hasPermission("user-1", "org-1", "admin", "access")

    expect(allowed).toBe(false)
    expect(prismaMock.role.findUnique).not.toHaveBeenCalled()
  })

  it("refuse si aucun Role système ne correspond au rôle de l'adhésion", async () => {
    prismaMock.membership.findFirst.mockResolvedValue({ role: "member" })
    prismaMock.role.findUnique.mockResolvedValue(null)

    const allowed = await hasPermission("user-1", "org-1", "admin", "access")

    expect(allowed).toBe(false)
  })

  it("refuse si le rôle n'a pas la permission demandée", async () => {
    prismaMock.membership.findFirst.mockResolvedValue({ role: "member" })
    prismaMock.role.findUnique.mockResolvedValue({
      permissions: [{ permission: { resource: "documents", action: "read" } }],
    })

    const allowed = await hasPermission("user-1", "org-1", "admin", "access")

    expect(allowed).toBe(false)
  })

  it("autorise si le rôle porte la permission resource:action demandée", async () => {
    prismaMock.membership.findFirst.mockResolvedValue({ role: "owner" })
    prismaMock.role.findUnique.mockResolvedValue({
      permissions: [{ permission: { resource: "admin", action: "access" } }],
    })

    const allowed = await hasPermission("user-1", "org-1", "admin", "access")

    expect(allowed).toBe(true)
  })
})

describe("seedSystemRoles", () => {
  it("upsert les 3 rôles système (owner/admin/member) pour l'organisation", async () => {
    prismaMock.role.upsert.mockImplementation(({ create }) => Promise.resolve({ id: `role-${create.key}`, ...create }))
    prismaMock.permission.upsert.mockImplementation(({ create }) =>
      Promise.resolve({ id: `perm-${create.resource}-${create.action}`, ...create })
    )
    prismaMock.rolePermission.upsert.mockResolvedValue({})

    await seedSystemRoles("org-1")

    expect(prismaMock.role.upsert).toHaveBeenCalledTimes(SYSTEM_ROLES.length)
    for (const { key } of SYSTEM_ROLES) {
      expect(prismaMock.role.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { organizationId_key: { organizationId: "org-1", key } } })
      )
    }
  })

  it("n'accorde la permission admin:access qu'aux rôles owner et admin, jamais member", async () => {
    prismaMock.role.upsert.mockImplementation(({ create }) => Promise.resolve({ id: `role-${create.key}`, ...create }))
    prismaMock.permission.upsert.mockResolvedValue({ id: "perm-admin-access", resource: "admin", action: "access" })
    prismaMock.rolePermission.upsert.mockResolvedValue({})

    await seedSystemRoles("org-1")

    // owner + admin => 1 permission chacun ; member => aucune.
    expect(prismaMock.rolePermission.upsert).toHaveBeenCalledTimes(2)
    expect(prismaMock.rolePermission.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { roleId_permissionId: { roleId: "role-owner", permissionId: "perm-admin-access" } } })
    )
    expect(prismaMock.rolePermission.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { roleId_permissionId: { roleId: "role-admin", permissionId: "perm-admin-access" } } })
    )
  })
})
