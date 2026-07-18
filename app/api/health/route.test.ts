import { describe, it, expect, vi, beforeEach } from "vitest"

const runHealthChecksMock = vi.fn()
vi.mock("@/lib/health", () => ({ runHealthChecks: runHealthChecksMock }))

const sendAlertMock = vi.fn().mockResolvedValue(undefined)
vi.mock("@/lib/alerts", () => ({ sendAlert: sendAlertMock }))

vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))

const okReport = {
  status: "ok" as const,
  timestamp: "2026-01-01T00:00:00.000Z",
  checks: {
    database: { status: "ok" as const, latencyMs: 5 },
    storage: { status: "ok" as const, latencyMs: 10 },
  },
}

const downReport = {
  status: "down" as const,
  timestamp: "2026-01-01T00:00:00.000Z",
  checks: {
    database: { status: "error" as const, latencyMs: 5, error: "connect ECONNREFUSED" },
    storage: { status: "ok" as const, latencyMs: 10 },
  },
}

/** État en mémoire du module (compteur d'échecs consécutifs) — réimporté à neuf à chaque test. */
async function freshRoute() {
  vi.resetModules()
  return import("./route")
}

beforeEach(() => {
  vi.clearAllMocks()
  delete process.env.HEALTH_ALERT_THRESHOLD
})

describe("GET /api/health", () => {
  it("retourne 200 et le rapport quand tout est OK, sans déclencher d'alerte", async () => {
    runHealthChecksMock.mockResolvedValue(okReport)
    const { GET } = await freshRoute()

    const response = await GET()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(okReport)
    expect(sendAlertMock).not.toHaveBeenCalled()
  })

  it("retourne 503 sur échec mais n'alerte pas avant le seuil (3 par défaut)", async () => {
    process.env.HEALTH_ALERT_THRESHOLD = "3"
    runHealthChecksMock.mockResolvedValue(downReport)
    const { GET } = await freshRoute()

    const first = await GET()
    const second = await GET()

    expect(first.status).toBe(503)
    expect(second.status).toBe(503)
    expect(sendAlertMock).not.toHaveBeenCalled()
  })

  it("déclenche une alerte au Nème échec consécutif, une seule fois", async () => {
    process.env.HEALTH_ALERT_THRESHOLD = "3"
    runHealthChecksMock.mockResolvedValue(downReport)
    const { GET } = await freshRoute()

    await GET()
    await GET()
    expect(sendAlertMock).not.toHaveBeenCalled()

    await GET() // 3ème échec consécutif
    expect(sendAlertMock).toHaveBeenCalledTimes(1)
    expect(sendAlertMock.mock.calls[0][0].subject).toContain("3 échecs consécutifs")

    await GET() // 4ème échec : déjà alerté, ne renvoie pas de nouvelle alerte
    expect(sendAlertMock).toHaveBeenCalledTimes(1)
  })

  it("envoie une alerte de rétablissement quand la santé revient à OK après une alerte", async () => {
    process.env.HEALTH_ALERT_THRESHOLD = "2"
    runHealthChecksMock.mockResolvedValue(downReport)
    const { GET } = await freshRoute()

    await GET()
    await GET() // déclenche l'alerte
    expect(sendAlertMock).toHaveBeenCalledTimes(1)

    runHealthChecksMock.mockResolvedValue(okReport)
    const recovered = await GET()

    expect(recovered.status).toBe(200)
    expect(sendAlertMock).toHaveBeenCalledTimes(2)
    expect(sendAlertMock.mock.calls[1][0].subject).toContain("Rétabli")
  })
})
