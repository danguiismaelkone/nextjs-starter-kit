import { describe, it, expect, vi, beforeEach } from "vitest"

const reportErrorMock = vi.fn()
vi.mock("@/lib/error-tracking", () => ({ reportError: reportErrorMock }))

const { logger } = await import("@/lib/logger")

function lastLoggedLine(spy: ReturnType<typeof vi.spyOn>): Record<string, unknown> {
  const call = spy.mock.calls.at(-1)
  return JSON.parse(call?.[0] as string)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("logger", () => {
  it("émet une ligne JSON structurée avec niveau, message et horodatage", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    logger.info("Hello", { userId: "u1" })
    const entry = lastLoggedLine(spy)

    expect(entry.level).toBe("info")
    expect(entry.message).toBe("Hello")
    expect(entry.userId).toBe("u1")
    expect(typeof entry.timestamp).toBe("string")
    spy.mockRestore()
  })

  it("masque les clés sensibles au premier niveau (mot de passe, clé API, token)", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {})
    logger.warn("test", { password: "hunter2", apiKey: "sk_live_xxx", token: "abc", authorization: "Bearer xyz", safe: "visible" })
    const entry = lastLoggedLine(spy)

    expect(entry.password).toBe("[REDACTED]")
    expect(entry.apiKey).toBe("[REDACTED]")
    expect(entry.token).toBe("[REDACTED]")
    expect(entry.authorization).toBe("[REDACTED]")
    expect(entry.safe).toBe("visible")
    spy.mockRestore()
  })

  it("masque les clés sensibles imbriquées, pas seulement au premier niveau", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {})
    logger.warn("test", { user: { name: "Alice", password: "hunter2" } })
    const entry = lastLoggedLine(spy)

    expect((entry.user as Record<string, unknown>).password).toBe("[REDACTED]")
    expect((entry.user as Record<string, unknown>).name).toBe("Alice")
    spy.mockRestore()
  })

  it("sérialise une Error en {name, message, stack} plutôt qu'en objet vide", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    logger.error("Échec", new Error("boom"), { userId: "u1" })
    const entry = lastLoggedLine(spy)

    const errorField = entry.error as { name: string; message: string; stack: string }
    expect(errorField.name).toBe("Error")
    expect(errorField.message).toBe("boom")
    expect(typeof errorField.stack).toBe("string")
    spy.mockRestore()
  })

  it("appelle reportError uniquement pour logger.error, pas pour info/warn", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    logger.info("a")
    logger.warn("b")
    expect(reportErrorMock).not.toHaveBeenCalled()

    logger.error("c", new Error("boom"))
    expect(reportErrorMock).toHaveBeenCalledTimes(1)

    spy.mockRestore()
    warnSpy.mockRestore()
    errorSpy.mockRestore()
  })
})
