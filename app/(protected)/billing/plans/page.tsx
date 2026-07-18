import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { getCurrentOrganization } from "@/lib/organization"
import { hasPermission } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { getOrganizationOwnerId, syncSubscriptionFromCheckoutSession } from "@/lib/billing"
import { daysUntil } from "@/lib/utils"
import { PlanGrid, type PlanData } from "@/components/billing/PlanGrid"

interface PlansPageProps {
  searchParams: Promise<{ session_id?: string; canceled?: string; scheduled?: string; effective?: string }>
}

export default async function PlansPage({ searchParams }: PlansPageProps) {
  const session = await getSession()
  if (!session?.user) redirect("/login")

  const organization = await getCurrentOrganization()
  if (!organization) redirect("/dashboard")

  // Seuls owner/admin de l'organisation peuvent souscrire un plan payant.
  const allowed = await hasPermission(session.user.id, organization.id, "admin", "access")
  if (!allowed) redirect("/dashboard")

  const ownerId = await getOrganizationOwnerId(organization.id)

  const { session_id: checkoutSessionId, canceled, scheduled, effective } = await searchParams
  if (checkoutSessionId && ownerId) {
    // Secours immédiat en attendant le webhook `checkout.session.completed`
    // (ITEM-022), qui reste la source de vérité pour les événements ultérieurs.
    await syncSubscriptionFromCheckoutSession(checkoutSessionId, ownerId)
  }

  const [plans, subscription] = await Promise.all([
    prisma.plan.findMany({ where: { isActive: true }, orderBy: { price: "asc" } }),
    ownerId ? prisma.subscription.findUnique({ where: { ownerId } }) : null,
  ])

  const planData: PlanData[] = plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    price: plan.price,
    currency: plan.currency,
    interval: plan.interval,
    features: Array.isArray(plan.features) ? (plan.features as unknown as string[]) : [],
  }))

  const currentPlan = subscription ? plans.find((plan) => plan.id === subscription.planId) : null
  const isTrial = subscription?.status === "trialing"
  const trialDaysLeft = isTrial ? daysUntil(subscription.currentPeriodEnd) : null

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Tarifs</h1>
        <p className="text-muted-foreground">Choisissez le plan adapté à {organization.name}.</p>
      </div>

      {isTrial && (
        <div className="mx-auto max-w-md rounded-md border border-blue-200 bg-blue-50 p-4 text-center text-sm text-blue-700">
          Essai gratuit : {trialDaysLeft} jour{(trialDaysLeft ?? 0) > 1 ? "s" : ""} restant
          {(trialDaysLeft ?? 0) > 1 ? "s" : ""}. Choisissez un plan ci-dessous pour continuer après l&apos;essai.
        </div>
      )}
      {checkoutSessionId && subscription && currentPlan && (
        <div className="mx-auto max-w-md rounded-md border border-primary/30 bg-primary/5 p-4 text-center text-sm">
          Abonnement actif : <span className="font-medium">{currentPlan.name}</span> (statut : {subscription.status}).
        </div>
      )}
      {canceled && (
        <div className="mx-auto max-w-md rounded-md border bg-muted/50 p-4 text-center text-sm text-muted-foreground">
          Souscription annulée, aucun paiement effectué.
        </div>
      )}
      {scheduled && effective && (
        <div className="mx-auto max-w-md rounded-md border border-primary/30 bg-primary/5 p-4 text-center text-sm">
          Changement de plan programmé pour le{" "}
          {new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(effective))}.
        </div>
      )}

      <PlanGrid
        plans={planData}
        currentPlanId={subscription?.planId}
        hasActiveSubscription={!!subscription?.stripeSubscriptionId}
      />
    </div>
  )
}
