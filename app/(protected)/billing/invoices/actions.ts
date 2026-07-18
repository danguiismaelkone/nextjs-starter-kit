"use server"

import { getSession } from "@/lib/auth"
import { getOrganizationOwnerId } from "@/lib/billing"
import { hasPermission } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import type { DataTablePage } from "@/components/data-table/DataTable"
import type { InvoiceRow } from "@/components/billing/TransactionTable"
import { INVOICES_PAGE_SIZE } from "./page-size"

/**
 * Page de factures d'une organisation (ITEM-061, pagination serveur) —
 * `organizationId` est lié via `.bind(null, organization.id)` côté page (Server
 * Component, `organization` déjà résolue/vérifiée à cet instant) avant d'être
 * passée au `DataTable` (Client Component) : les arguments liés d'une Server
 * Action transmise à un Client Component sont scellés côté serveur, jamais
 * modifiables depuis le client — `hasPermission` ci-dessous revérifie
 * simplement que l'utilisateur courant a toujours les droits sur cette
 * organisation (une session peut expirer/changer de rôle entre deux pages).
 */
export async function getInvoicesPageAction(organizationId: string, page: number): Promise<DataTablePage<InvoiceRow>> {
  const session = await getSession()
  if (!session?.user) return { data: [], total: 0 }

  const allowed = await hasPermission(session.user.id, organizationId, "admin", "access")
  if (!allowed) return { data: [], total: 0 }

  // La facturation est rattachée à l'owner de l'organisation (ITEM-094).
  const ownerId = await getOrganizationOwnerId(organizationId)
  const where = { subscription: { ownerId: ownerId ?? "" } }
  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (Math.max(1, page) - 1) * INVOICES_PAGE_SIZE,
      take: INVOICES_PAGE_SIZE,
    }),
    prisma.invoice.count({ where }),
  ])

  return {
    data: invoices.map((invoice) => ({
      id: invoice.id,
      amount: invoice.amount,
      currency: invoice.currency,
      status: invoice.status,
      issuedAt: invoice.issuedAt,
      invoicePdfUrl: invoice.invoicePdfUrl,
    })),
    total,
  }
}
