"use client"

import { DataTable, type DataTableColumn, type DataTablePage } from "@/components/data-table/DataTable"
import { Badge } from "@/components/ui/badge"
import { AUDIT_ACTION_LABELS } from "@/lib/audit-labels"
import type { AuditEntryRow } from "./actions"

interface AuditDataTableProps {
  initialEntries: AuditEntryRow[]
  initialTotal: number
  pageSize: number
  fetchPage: (page: number) => Promise<DataTablePage<AuditEntryRow>>
}

const columns: DataTableColumn<AuditEntryRow>[] = [
  {
    id: "date",
    header: "Date",
    cellClassName: "whitespace-nowrap",
    cell: (entry) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(entry.createdAt),
  },
  { id: "actor", header: "Acteur", cell: (entry) => entry.actorName ?? "Utilisateur supprimé" },
  {
    id: "action",
    header: "Action",
    cell: (entry) => <Badge variant="secondary">{AUDIT_ACTION_LABELS[entry.action] ?? entry.action}</Badge>,
  },
  {
    id: "target",
    header: "Cible",
    cellClassName: "text-muted-foreground",
    cell: (entry) => `${entry.targetType} · ${entry.targetId}`,
  },
]

/** Journal d'audit (ITEM-051) — pagination serveur sans rechargement de page (ITEM-061). */
export function AuditDataTable({ initialEntries, initialTotal, pageSize, fetchPage }: AuditDataTableProps) {
  return (
    <DataTable
      columns={columns}
      initialData={initialEntries}
      initialTotal={initialTotal}
      pageSize={pageSize}
      getRowId={(entry) => entry.id}
      fetchPage={fetchPage}
      emptyMessage="Aucune entrée trouvée."
    />
  )
}
