"use client"

import { Badge } from "@/components/ui/badge"
import { DataTable, type DataTableColumn, type DataTablePage } from "@/components/data-table/DataTable"

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  paid: { label: "Payée", className: "bg-green-100 text-green-700 border-green-200" },
  open: { label: "En attente", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  draft: { label: "Brouillon", className: "bg-gray-100 text-gray-600 border-gray-200" },
  uncollectible: { label: "Irrécouvrable", className: "bg-red-100 text-red-700 border-red-200" },
  void: { label: "Annulée", className: "bg-gray-100 text-gray-600 border-gray-200" },
}

export interface InvoiceRow {
  id: string
  amount: number
  currency: string
  status: string
  issuedAt: Date | null
  invoicePdfUrl: string | null
}

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(amount / 100)
}

const columns: DataTableColumn<InvoiceRow>[] = [
  { id: "amount", header: "Montant", cell: (invoice) => formatAmount(invoice.amount, invoice.currency) },
  {
    id: "date",
    header: "Date",
    cell: (invoice) => (invoice.issuedAt ? invoice.issuedAt.toLocaleDateString("fr-FR") : "—"),
  },
  {
    id: "status",
    header: "Statut",
    cell: (invoice) => {
      const badge = STATUS_MAP[invoice.status] ?? STATUS_MAP.open
      return (
        <Badge variant="outline" className={badge.className}>
          {badge.label}
        </Badge>
      )
    },
  },
  {
    id: "pdf",
    header: "Facture",
    headClassName: "text-right",
    cellClassName: "text-right",
    cell: (invoice) =>
      invoice.invoicePdfUrl ? (
        <a
          href={invoice.invoicePdfUrl}
          target="_blank"
          rel="noreferrer"
          className="text-primary underline underline-offset-4"
        >
          PDF
        </a>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
]

interface TransactionTableProps {
  initialInvoices: InvoiceRow[]
  initialTotal: number
  pageSize: number
  fetchPage: (page: number) => Promise<DataTablePage<InvoiceRow>>
}

/** Historique de facturation (ITEM-023) — pagination serveur sans rechargement de page (ITEM-061). */
export function TransactionTable({ initialInvoices, initialTotal, pageSize, fetchPage }: TransactionTableProps) {
  return (
    <DataTable
      columns={columns}
      initialData={initialInvoices}
      initialTotal={initialTotal}
      pageSize={pageSize}
      getRowId={(invoice) => invoice.id}
      fetchPage={fetchPage}
      emptyMessage="Aucune facture pour le moment."
    />
  )
}
