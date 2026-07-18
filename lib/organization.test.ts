import { describe, it, expect, vi, beforeEach } from "vitest"

const cookiesMock = vi.fn()
const headersMock = vi.fn()
vi.mock("next/headers", () => ({ cookies: cookiesMock, headers: headersMock }))

const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`)
})
vi.mock("next/navigation", () => ({ redirect: redirectMock }))

const getSessionMock = vi.fn()
vi.mock("@/lib/auth", () => ({ getSession: getSessionMock }))

const prismaMock = {
  membership: { findFirst: vi.fn() },
}
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))

vi.mock("@/lib/permissions", () => ({ seedSystemRoles: vi.fn() }))
vi.mock("@/lib/billing", () => ({ startTrialSubscription: vi.fn() }))

const { getCurrentOrganization } = await import("@/lib/organization")

function mockHeaders(domain: string | null) {
  headersMock.mockResolvedValue({ get: (key: string) => (key === "x-organization-domain" ? domain : null) })
}

function mockCookies(activeOrganizationId: string | null) {
  cookiesMock.mockResolvedValue({
    get: () => (activeOrganizationId ? { value: activeOrganizationId } : undefined),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.BETTER_AUTH_URL = "http://localhost:3000"
  mockHeaders(null)
  mockCookies(null)
})

describe("getCurrentOrganization", () => {
  it("retourne null sans session", async () => {
    getSessionMock.mockResolvedValue(null)

    expect(await getCurrentOrganization()).toBeNull()
    expect(headersMock).not.toHaveBeenCalled()
  })

  it("résout par domaine personnalisé (ITEM-068) quand le Host correspond à une organisation dont l'utilisateur est membre", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u1" } })
    mockHeaders("client.example.com")
    prismaMock.membership.findFirst.mockResolvedValue({
      role: "admin",
      organization: { id: "org-1", name: "Client Co", slug: "client-co", logo: null, primaryColor: null },
    })

    const organization = await getCurrentOrganization()

    expect(organization).toEqual({
      id: "org-1",
      name: "Client Co",
      slug: "client-co",
      logo: null,
      primaryColor: null,
      role: "admin",
    })
    expect(prismaMock.membership.findFirst).toHaveBeenCalledWith({
      where: { userId: "u1", status: "active", organization: { customDomain: "client.example.com" } },
      include: { organization: true },
    })
    // Résolution stricte par domaine : le cookie n'est jamais consulté ici.
    expect(cookiesMock).not.toHaveBeenCalled()
  })

  it("refuse (null) sans repli sur le cookie quand le domaine est reconnu mais l'utilisateur n'en est pas membre", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u1" } })
    mockHeaders("client.example.com")
    prismaMock.membership.findFirst.mockResolvedValue(null)
    mockCookies("org-other")

    const organization = await getCurrentOrganization()

    expect(organization).toBeNull()
    // Ne doit jamais retomber sur une autre organisation dont l'utilisateur
    // serait membre par ailleurs — le domaine White Label est isolé.
    expect(cookiesMock).not.toHaveBeenCalled()
  })

  it("ignore la résolution par domaine et retombe sur le cookie pour le domaine propre de la plateforme", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u1" } })
    mockHeaders("localhost") // dérivé de BETTER_AUTH_URL=http://localhost:3000
    mockCookies("org-1")
    prismaMock.membership.findFirst.mockResolvedValue({
      role: "owner",
      organization: { id: "org-1", name: "Ma Boîte", slug: "ma-boite", logo: null, primaryColor: "#111111" },
    })

    const organization = await getCurrentOrganization()

    expect(organization?.id).toBe("org-1")
    expect(cookiesMock).toHaveBeenCalled()
  })

  it("retombe sur le cookie quand aucun en-tête de domaine n'est présent (requête sans middleware, ex. tests)", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u1" } })
    mockHeaders(null)
    mockCookies(null)
    prismaMock.membership.findFirst.mockResolvedValue({
      role: "member",
      organization: { id: "org-2", name: "Autre", slug: "autre", logo: null, primaryColor: null },
    })

    const organization = await getCurrentOrganization()

    expect(organization?.id).toBe("org-2")
  })
})
