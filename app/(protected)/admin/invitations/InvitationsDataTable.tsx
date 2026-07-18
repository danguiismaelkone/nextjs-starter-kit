"use client"

import { forwardRef } from "react"
import {
  DataTable,
  type DataTableColumn,
  type DataTableFetchContext,
  type DataTableFilters,
  type DataTableHandle,
  type DataTablePage,
} from "@/components/data-table/DataTable"
import { Badge } from "@/components/ui/badge"
import { InvitationRowActions } from "./InvitationRowActions"
import type { InvitationRow } from "./actions"

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  accepted: "Acceptée",
  revoked: "Révoquée",
}

const STATUS_VARIANTS: Record<string, "outline" | "default" | "secondary"> = {
  pending: "outline",
  accepted: "default",
  revoked: "secondary",
}

interface InvitationsDataTableProps {
  initialInvitations: InvitationRow[]
  initialTotal: number
  pageSize: number
  fetchPage: (page: number, context?: DataTableFetchContext) => Promise<DataTablePage<InvitationRow>>
  /** Filtre dérivé de l'URL par la page appelante (ITEM-080, `CategoryStatCards`) — synchronise la chip "Statut" du DataTable dès le montage. */
  initialFilters?: DataTableFilters
}

/**
 * Liste des invitations de l'organisation (ITEM-008/016) — migrée vers le
 * gabarit CRUD standard (ITEM-080, même structure que `UsersDataTable`) :
 * pagination serveur (absente auparavant), tri, filtre par statut, recherche
 * en chip sur l'e-mail (ITEM-076/079). Expose une référence impérative
 * (`ref.refresh()`) : le bouton « Inviter » vit dans `PageHeader.actions`
 * (`InvitationsPageClient.tsx`), hors de cet arbre.
 */
export const InvitationsDataTable = forwardRef<DataTableHandle, InvitationsDataTableProps>(
  function InvitationsDataTable({ initialInvitations, initialTotal, pageSize, fetchPage, initialFilters }, ref) {
    const columns: DataTableColumn<InvitationRow>[] = [
      {
        id: "email",
        header: "E-mail",
        cell: (invitation) => invitation.email,
        sortable: true,
        exportValue: (invitation) => invitation.email,
      },
      {
        id: "role",
        header: "Rôle",
        cell: (invitation) => (
          <Badge variant={invitation.role === "admin" ? "default" : "secondary"}>
            {invitation.role === "admin" ? "Administrateur" : "Utilisateur"}
          </Badge>
        ),
      },
      {
        id: "status",
        header: "Statut",
        label: "Statut",
        filterable: true,
        filterType: "select",
        filterOptions: [
          { label: "En attente", value: "pending" },
          { label: "Acceptées", value: "accepted" },
          { label: "Révoquées", value: "revoked" },
        ],
        cell: (invitation) => (
          <Badge variant={STATUS_VARIANTS[invitation.status]}>{STATUS_LABELS[invitation.status]}</Badge>
        ),
      },
      {
        id: "expiresAt",
        header: "Expire le",
        sortable: true,
        cell: (invitation) => invitation.expiresAt.toLocaleDateString("fr-FR"),
      },
      {
        id: "actions",
        header: "Actions",
        headClassName: "text-right",
        cellClassName: "text-right",
        hideable: false,
        cell: (invitation) =>
          invitation.status === "pending" ? (
            <InvitationRowActions id={invitation.id} email={invitation.email} />
          ) : null,
      },
    ]

    return (
      <DataTable
        ref={ref}
        columns={columns}
        initialData={initialInvitations}
        initialTotal={initialTotal}
        pageSize={pageSize}
        getRowId={(invitation) => invitation.id}
        fetchPage={fetchPage}
        initialFilters={initialFilters}
        emptyMessage="Aucune invitation envoyée."
        enableSearch
        searchPlaceholder="Rechercher par e-mail"
      />
    )
  }
)
