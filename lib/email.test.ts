import { describe, it, expect, vi, beforeEach } from "vitest"

const sendMock = vi.fn().mockResolvedValue({ error: null })
class ResendMock {
  emails = { send: sendMock }
}
vi.mock("resend", () => ({ Resend: ResendMock }))

vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn() } }))

const { sendEmail } = await import("@/lib/email")

beforeEach(() => {
  vi.clearAllMocks()
  sendMock.mockResolvedValue({ error: null })
  process.env.RESEND_API_KEY = "test-key"
  process.env.EMAIL_FROM = "onboarding@resend.dev"
})

describe("sendEmail", () => {
  it("utilise EMAIL_FROM tel quel sans fromName (ITEM-069, comportement par défaut)", async () => {
    await sendEmail({ to: "user@example.com", subject: "Sujet", html: "<p>Corps</p>" })

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ from: "onboarding@resend.dev" })
    )
  })

  it("préfixe l'adresse d'envoi du nom d'expéditeur White Label quand fourni", async () => {
    await sendEmail({ to: "user@example.com", subject: "Sujet", html: "<p>Corps</p>", fromName: "Acme Support" })

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ from: "Acme Support <onboarding@resend.dev>" })
    )
  })
})
