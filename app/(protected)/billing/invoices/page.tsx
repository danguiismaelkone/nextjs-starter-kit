import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { getOrganizationOwnerId } from "@/lib/billing"
import { getCurrentOrganization } from "@/lib/organization"
import { hasPermission } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { TransactionTable } from "@/components/billing/TransactionTable"
import { PageHeader } from "@/components/layout/PageHeader"
import { getInvoicesPageAction } from "./actions"
import { INVOICES_PAGE_SIZE } from "./page-size"

export default async function InvoicesPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")

  const organization = await getCurrentOrganization()
  if (!organization) redirect("/dashboard")

  // Accessible uniquement aux owner/admin de l'organisation.
  const allowed = await hasPermission(session.user.id, organization.id, "admin", "access")
  if (!allowed) redirect("/dashboard")

  // La facturation est rattachée à l'owner de l'organisation (ITEM-094).
  const ownerId = await getOrganizationOwnerId(organization.id)
  const where = { subscription: { ownerId: ownerId ?? "" } }
  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: INVOICES_PAGE_SIZE,
    }),
    prisma.invoice.count({ where }),
  ])

  return (
    <div className="space-y-6">
      <PageHeader title="Factures" description={`Historique de facturation de ${organization.name}.`} />

      <TransactionTable
        initialInvoices={invoices.map((invoice) => ({
          id: invoice.id,
          amount: invoice.amount,
          currency: invoice.currency,
          status: invoice.status,
          issuedAt: invoice.issuedAt,
          invoicePdfUrl: invoice.invoicePdfUrl,
        }))}
        initialTotal={total}
        pageSize={INVOICES_PAGE_SIZE}
        fetchPage={getInvoicesPageAction.bind(null, organization.id)}
      />
    </div>
  )
}
