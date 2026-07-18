import Link from "next/link"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { getOrganizationOwnerId } from "@/lib/billing"
import { getCurrentOrganization } from "@/lib/organization"
import { hasPermission } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { SubscriptionStatus } from "@/components/billing/SubscriptionStatus"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/layout/PageHeader"
import { DetailPageLayout, DetailPanelSection } from "@/components/layout/DetailPageLayout"

export default async function BillingPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")

  const organization = await getCurrentOrganization()
  if (!organization) redirect("/dashboard")

  // Accessible uniquement aux owner/admin de l'organisation.
  const allowed = await hasPermission(session.user.id, organization.id, "admin", "access")
  if (!allowed) redirect("/dashboard")

  // L'abonnement est rattaché à l'owner de l'organisation, pas à
  // l'organisation elle-même (ITEM-094). Un admin non-owner de l'organisation
  // voit ce même abonnement en lecture seule (ITEM-096) — seul l'owner peut
  // le gérer (portail, changement de plan, résiliation), potentiellement
  // partagé avec d'autres organisations qu'il possède (ITEM-093).
  const ownerId = await getOrganizationOwnerId(organization.id)
  const canManage = session.user.id === ownerId
  const [owner, subscription, ownedOrganizations] = await Promise.all([
    ownerId ? prisma.user.findUniqueOrThrow({ where: { id: ownerId } }) : null,
    ownerId ? prisma.subscription.findUnique({ where: { ownerId }, include: { plan: true } }) : null,
    ownerId
      ? prisma.organization.findMany({
          where: { memberships: { some: { userId: ownerId, role: "owner", status: "active" } } },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : [],
  ])

  return (
    <DetailPageLayout
      header={
        <PageHeader
          title="Facturation"
          description={`Abonnement et factures de ${organization.name}.`}
          actions={
            <Button variant="outline" size="sm" asChild>
              <Link href="/billing/invoices">Voir les factures</Link>
            </Button>
          }
        />
      }
      details={
        <DetailPanelSection
          title="Abonnement"
          fields={[
            { label: "Plan", value: subscription?.plan?.name ?? "Aucun" },
            { label: "Statut", value: subscription?.status ?? "—" },
            {
              label: "Prochaine échéance",
              value: subscription ? subscription.currentPeriodEnd.toLocaleDateString("fr-FR") : "—",
            },
            ...(ownedOrganizations.length > 1
              ? [
                  {
                    label: "Organisations couvertes",
                    value: (
                      <ul className="flex flex-col gap-1">
                        {ownedOrganizations.map((org) => (
                          <li key={org.id} className={org.id === organization.id ? "font-medium" : undefined}>
                            {org.name}
                          </li>
                        ))}
                      </ul>
                    ),
                  },
                ]
              : []),
          ]}
        />
      }
    >
      <SubscriptionStatus
        subscription={
          subscription
            ? {
                status: subscription.status,
                planName: subscription.plan?.name ?? null,
                currentPeriodEnd: subscription.currentPeriodEnd,
                cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
                hasStripeSubscription: !!subscription.stripeSubscriptionId,
              }
            : null
        }
        hasStripeCustomer={!!owner?.stripeCustomerId}
        canManage={canManage}
      />
    </DetailPageLayout>
  )
}
