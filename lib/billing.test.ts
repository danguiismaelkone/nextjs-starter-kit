import { describe, it, expect, vi, beforeEach } from "vitest"

const prismaMock = {
  subscription: { create: vi.fn(), findUnique: vi.fn(), upsert: vi.fn() },
  membership: { findFirst: vi.fn(), findMany: vi.fn() },
  user: { findUnique: vi.fn() },
  plan: { findUnique: vi.fn() },
  invoice: { upsert: vi.fn() },
}
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))

const getStripeClientMock = vi.fn()
vi.mock("@/lib/stripe", () => ({ getStripeClient: getStripeClientMock }))

const triggerWebhooksMock = vi.fn().mockResolvedValue(undefined)
vi.mock("@/lib/webhooks", () => ({ triggerWebhooks: triggerWebhooksMock }))

const {
  startTrialSubscription,
  hasActiveEntitlement,
  isEnterpriseOrganization,
  isWhiteLabelOrganization,
  upsertSubscriptionFromStripe,
  syncSubscriptionFromStripeSubscription,
  recordInvoiceFromStripe,
  TRIAL_PERIOD_DAYS,
} = await import("@/lib/billing")

beforeEach(() => {
  vi.clearAllMocks()
  // Owner par défaut résolu pour une organisation (ITEM-094) — les tests qui
  // veulent le cas "sans owner actif" surchargent explicitement ce mock.
  prismaMock.membership.findFirst.mockResolvedValue({ userId: "owner-1" })
})

describe("startTrialSubscription", () => {
  it("crée un abonnement 'trialing' expirant dans TRIAL_PERIOD_DAYS jours, sans plan", async () => {
    const before = Date.now()
    await startTrialSubscription("owner-1")
    const after = Date.now()

    expect(prismaMock.subscription.create).toHaveBeenCalledTimes(1)
    const data = prismaMock.subscription.create.mock.calls[0][0].data
    expect(data.ownerId).toBe("owner-1")
    expect(data.status).toBe("trialing")
    expect(data.planId).toBeUndefined()

    const expectedMs = TRIAL_PERIOD_DAYS * 24 * 60 * 60 * 1000
    const delta = data.currentPeriodEnd.getTime() - before
    expect(delta).toBeGreaterThanOrEqual(expectedMs - 1000)
    expect(delta).toBeLessThanOrEqual(after - before + expectedMs + 1000)
  })
})

describe("hasActiveEntitlement", () => {
  it("refuse une organisation sans owner actif", async () => {
    prismaMock.membership.findFirst.mockResolvedValue(null)
    expect(await hasActiveEntitlement("org-1")).toBe(false)
    expect(prismaMock.subscription.findUnique).not.toHaveBeenCalled()
  })

  it("refuse une organisation sans abonnement", async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(null)
    expect(await hasActiveEntitlement("org-1")).toBe(false)
  })

  it("refuse un abonnement 'canceled'", async () => {
    prismaMock.subscription.findUnique.mockResolvedValue({
      status: "canceled",
      currentPeriodEnd: new Date(Date.now() + 100_000),
    })
    expect(await hasActiveEntitlement("org-1")).toBe(false)
  })

  it("refuse un abonnement 'trialing' dont la période est expirée", async () => {
    prismaMock.subscription.findUnique.mockResolvedValue({
      status: "trialing",
      currentPeriodEnd: new Date(Date.now() - 1000),
    })
    expect(await hasActiveEntitlement("org-1")).toBe(false)
  })

  it("autorise un abonnement 'trialing' dans sa période en cours", async () => {
    prismaMock.subscription.findUnique.mockResolvedValue({
      status: "trialing",
      currentPeriodEnd: new Date(Date.now() + 100_000),
    })
    expect(await hasActiveEntitlement("org-1")).toBe(true)
  })

  it("autorise un abonnement 'active' dans sa période en cours", async () => {
    prismaMock.subscription.findUnique.mockResolvedValue({
      status: "active",
      currentPeriodEnd: new Date(Date.now() + 100_000),
    })
    expect(await hasActiveEntitlement("org-1")).toBe(true)
    expect(prismaMock.subscription.findUnique).toHaveBeenCalledWith({ where: { ownerId: "owner-1" } })
  })
})

describe("isEnterpriseOrganization", () => {
  it("refuse une organisation sans owner actif", async () => {
    prismaMock.membership.findFirst.mockResolvedValue(null)
    expect(await isEnterpriseOrganization("org-1")).toBe(false)
  })

  it("refuse une organisation sans abonnement", async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(null)
    expect(await isEnterpriseOrganization("org-1")).toBe(false)
  })

  it("refuse un abonnement sans plan (essai gratuit)", async () => {
    prismaMock.subscription.findUnique.mockResolvedValue({ plan: null })
    expect(await isEnterpriseOrganization("org-1")).toBe(false)
  })

  it("refuse un abonnement sur un plan autre qu'Enterprise", async () => {
    prismaMock.subscription.findUnique.mockResolvedValue({ plan: { name: "Pro" } })
    expect(await isEnterpriseOrganization("org-1")).toBe(false)
  })

  it("autorise un abonnement sur le plan Enterprise", async () => {
    prismaMock.subscription.findUnique.mockResolvedValue({ plan: { name: "Enterprise" } })
    expect(await isEnterpriseOrganization("org-1")).toBe(true)
  })
})

describe("isWhiteLabelOrganization", () => {
  it("refuse une organisation sans abonnement", async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(null)
    expect(await isWhiteLabelOrganization("org-1")).toBe(false)
  })

  it("refuse un abonnement sur le plan Enterprise (pas White Label)", async () => {
    prismaMock.subscription.findUnique.mockResolvedValue({ plan: { name: "Enterprise" } })
    expect(await isWhiteLabelOrganization("org-1")).toBe(false)
  })

  it("autorise un abonnement sur le plan White Label", async () => {
    prismaMock.subscription.findUnique.mockResolvedValue({ plan: { name: "White Label" } })
    expect(await isWhiteLabelOrganization("org-1")).toBe(true)
  })
})

function fakeStripeSubscription(options: { withCurrentPeriodEnd?: boolean } = {}) {
  const { withCurrentPeriodEnd = true } = options
  return {
    id: "sub_123",
    status: "active",
    customer: "cus_123",
    cancel_at_period_end: false,
    items: {
      data: [
        {
          ...(withCurrentPeriodEnd ? { current_period_end: 1_700_000_000 } : {}),
          price: { id: "price_123" },
        },
      ],
    },
  } as unknown as import("stripe").default.Subscription
}

describe("upsertSubscriptionFromStripe", () => {
  it("ne fait rien si l'objet Stripe n'a pas de current_period_end (payload inattendu)", async () => {
    const subscription = fakeStripeSubscription({ withCurrentPeriodEnd: false })

    await upsertSubscriptionFromStripe("owner-1", "plan-1", subscription)

    expect(prismaMock.subscription.upsert).not.toHaveBeenCalled()
  })

  it("upsert l'abonnement local à partir de l'objet Stripe", async () => {
    const subscription = fakeStripeSubscription()

    await upsertSubscriptionFromStripe("owner-1", "plan-1", subscription)

    expect(prismaMock.subscription.upsert).toHaveBeenCalledTimes(1)
    const call = prismaMock.subscription.upsert.mock.calls[0][0]
    expect(call.where).toEqual({ ownerId: "owner-1" })
    expect(call.create).toMatchObject({ ownerId: "owner-1", planId: "plan-1", status: "active", stripeSubscriptionId: "sub_123" })
    expect(call.update).toMatchObject({ planId: "plan-1", status: "active" })
  })
})

describe("syncSubscriptionFromStripeSubscription", () => {
  it("ne fait rien si aucun owner local ne correspond au client Stripe", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)

    await syncSubscriptionFromStripeSubscription(fakeStripeSubscription())

    expect(prismaMock.plan.findUnique).not.toHaveBeenCalled()
    expect(prismaMock.subscription.upsert).not.toHaveBeenCalled()
  })

  it("ne fait rien si le prix Stripe ne correspond à aucun plan local", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "owner-1" })
    prismaMock.plan.findUnique.mockResolvedValue(null)

    await syncSubscriptionFromStripeSubscription(fakeStripeSubscription())

    expect(prismaMock.subscription.upsert).not.toHaveBeenCalled()
  })

  it("synchronise l'abonnement local quand owner et plan sont résolus", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "owner-1" })
    prismaMock.plan.findUnique.mockResolvedValue({ id: "plan-1" })

    await syncSubscriptionFromStripeSubscription(fakeStripeSubscription())

    expect(prismaMock.subscription.upsert).toHaveBeenCalledTimes(1)
    expect(prismaMock.subscription.upsert.mock.calls[0][0].create).toMatchObject({ ownerId: "owner-1", planId: "plan-1" })
  })
})

function fakeStripeInvoice(overrides: Record<string, unknown> = {}) {
  return {
    id: "in_123",
    amount_paid: 2900,
    amount_due: 2900,
    currency: "usd",
    status: "paid",
    invoice_pdf: "https://stripe.example/invoice.pdf",
    created: 1_700_000_000,
    parent: { subscription_details: { subscription: "sub_123" } },
    ...overrides,
  } as unknown as import("stripe").default.Invoice
}

describe("recordInvoiceFromStripe", () => {
  it("ne fait rien si la facture ne référence aucun abonnement Stripe", async () => {
    const invoice = fakeStripeInvoice({ parent: { subscription_details: { subscription: undefined } } })

    await recordInvoiceFromStripe(invoice)

    expect(prismaMock.invoice.upsert).not.toHaveBeenCalled()
  })

  it("ne fait rien si l'abonnement Stripe n'est pas encore synchronisé localement", async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(null)

    await recordInvoiceFromStripe(fakeStripeInvoice())

    expect(prismaMock.invoice.upsert).not.toHaveBeenCalled()
  })

  it("enregistre la facture et déclenche invoice.paid pour chaque organisation possédée par l'owner", async () => {
    prismaMock.subscription.findUnique.mockResolvedValue({ id: "local-sub-1", ownerId: "owner-1" })
    prismaMock.invoice.upsert.mockResolvedValue({ id: "invoice-1", amount: 2900, currency: "usd" })
    prismaMock.membership.findMany.mockResolvedValue([{ organizationId: "org-1" }, { organizationId: "org-2" }])

    await recordInvoiceFromStripe(fakeStripeInvoice())

    expect(prismaMock.invoice.upsert).toHaveBeenCalledTimes(1)
    expect(prismaMock.membership.findMany).toHaveBeenCalledWith({
      where: { userId: "owner-1", role: "owner", status: "active" },
      select: { organizationId: true },
    })
    expect(triggerWebhooksMock).toHaveBeenCalledWith("org-1", "invoice.paid", expect.objectContaining({ invoiceId: "invoice-1" }))
    expect(triggerWebhooksMock).toHaveBeenCalledWith("org-2", "invoice.paid", expect.objectContaining({ invoiceId: "invoice-1" }))
  })

  it("n'appelle pas triggerWebhooks quand la facture n'est pas payée", async () => {
    prismaMock.subscription.findUnique.mockResolvedValue({ id: "local-sub-1", ownerId: "owner-1" })
    prismaMock.invoice.upsert.mockResolvedValue({ id: "invoice-2", amount: 2900, currency: "usd" })

    await recordInvoiceFromStripe(fakeStripeInvoice({ status: "open" }))

    expect(triggerWebhooksMock).not.toHaveBeenCalled()
    expect(prismaMock.membership.findMany).not.toHaveBeenCalled()
  })
})
