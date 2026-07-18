import { describe, it, expect, vi, beforeEach } from "vitest"

const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`)
})
vi.mock("next/navigation", () => ({ redirect: redirectMock }))

const getSessionMock = vi.fn()
vi.mock("@/lib/auth", () => ({ getSession: getSessionMock }))

const getCurrentOrganizationMock = vi.fn()
vi.mock("@/lib/organization", () => ({ getCurrentOrganization: getCurrentOrganizationMock }))

const hasPermissionMock = vi.fn()
vi.mock("@/lib/permissions", () => ({ hasPermission: hasPermissionMock }))

const { requireAdmin, requireSuperAdmin } = await import("@/lib/authorization")

beforeEach(() => {
  vi.clearAllMocks()
  redirectMock.mockImplementation((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  })
})

describe("requireAdmin", () => {
  it("redirige vers /login si aucune session", async () => {
    getSessionMock.mockResolvedValue(null)

    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/login")
  })

  it("redirige vers /dashboard si l'utilisateur n'a aucune organisation active", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u1" } })
    getCurrentOrganizationMock.mockResolvedValue(null)

    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/dashboard")
  })

  it("redirige vers /dashboard si l'utilisateur n'a pas la permission admin:access", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u1" } })
    getCurrentOrganizationMock.mockResolvedValue({ id: "org-1" })
    hasPermissionMock.mockResolvedValue(false)

    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/dashboard")
    expect(hasPermissionMock).toHaveBeenCalledWith("u1", "org-1", "admin", "access")
  })

  it("retourne la session si l'utilisateur a la permission admin:access", async () => {
    const session = { user: { id: "u1" } }
    getSessionMock.mockResolvedValue(session)
    getCurrentOrganizationMock.mockResolvedValue({ id: "org-1" })
    hasPermissionMock.mockResolvedValue(true)

    await expect(requireAdmin()).resolves.toBe(session)
  })
})

describe("requireSuperAdmin", () => {
  it("redirige vers /login si aucune session", async () => {
    getSessionMock.mockResolvedValue(null)

    await expect(requireSuperAdmin()).rejects.toThrow("REDIRECT:/login")
  })

  it("redirige vers /dashboard si le rôle global n'est pas superadmin", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u1", role: "user" } })

    await expect(requireSuperAdmin()).rejects.toThrow("REDIRECT:/dashboard")
  })

  it("retourne la session si le rôle global est superadmin", async () => {
    const session = { user: { id: "u1", role: "superadmin" } }
    getSessionMock.mockResolvedValue(session)

    await expect(requireSuperAdmin()).resolves.toBe(session)
  })
})
