"use client"

import { forwardRef } from "react"
import { ShieldOff, ShieldCheck } from "lucide-react"
import {
  DataTable,
  type DataTableColumn,
  type DataTableFetchContext,
  type DataTableFilters,
  type DataTableHandle,
  type DataTablePage,
} from "@/components/data-table/DataTable"
import { Badge } from "@/components/ui/badge"
import { UserFormDialog } from "./UserFormDialog"
import { DisableUserButton } from "./DisableUserButton"
import { RemoveMemberButton } from "./RemoveMemberButton"
import { bulkSetUsersDisabledAction, importUsersAction, type UserRow } from "./actions"

interface UsersDataTableProps {
  initialUsers: UserRow[]
  initialTotal: number
  pageSize: number
  currentUserId: string
  fetchPage: (page: number, context?: DataTableFetchContext) => Promise<DataTablePage<UserRow>>
  /** Filtre dérivé de l'URL par la page appelante (ITEM-077, `CategoryStatCards`) — synchronise la chip "Statut" du DataTable dès le montage. */
  initialFilters?: DataTableFilters
}

/**
 * Liste des utilisateurs de l'organisation (ITEM-007/016) — pagination
 * serveur sans rechargement de page (ITEM-061), enrichie de tri/filtres/
 * recherche/sélection groupée/export/import/colonne fixe (ITEM-076/079, page
 * de référence pour le nouveau standard de DataTable) et composée avec le
 * gabarit de page (en-tête/onglets/cartes de statistiques, ITEM-077). Expose
 * une référence impérative (`ref.refresh()`, ITEM-079) : le bouton « Nouvel
 * utilisateur » vit désormais dans `PageHeader.actions`
 * (`UsersPageClient.tsx`), hors de cet arbre — il en a besoin pour rafraîchir
 * la liste après création.
 */
export const UsersDataTable = forwardRef<DataTableHandle, UsersDataTableProps>(function UsersDataTable(
  { initialUsers, initialTotal, pageSize, currentUserId, fetchPage, initialFilters },
  ref
) {
  const columns: DataTableColumn<UserRow>[] = [
    { id: "name", header: "Nom", cell: (user) => user.name, sortable: true, exportValue: (user) => user.name },
    { id: "email", header: "E-mail", cell: (user) => user.email, sortable: true, exportValue: (user) => user.email },
    {
      id: "role",
      header: "Rôle",
      label: "Rôle",
      filterable: true,
      filterType: "select",
      filterOptions: [
        { label: "Administrateur", value: "admin" },
        { label: "Utilisateur", value: "user" },
      ],
      exportValue: (user) => user.role,
      cell: (user) => (
        <Badge variant={user.role === "admin" ? "default" : "secondary"}>
          {user.role === "admin" ? "Administrateur" : "Utilisateur"}
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
        { label: "Actifs", value: "active" },
        { label: "Désactivés", value: "disabled" },
      ],
      exportValue: (user) => (user.disabledAt ? "disabled" : "active"),
      cell: (user) => (
        <Badge variant={user.disabledAt ? "destructive" : "outline"}>{user.disabledAt ? "Désactivé" : "Actif"}</Badge>
      ),
    },
    {
      id: "createdAt",
      header: "Créé le",
      sortable: true,
      exportValue: (user) => user.createdAt.toISOString(),
      cell: (user) => user.createdAt.toLocaleDateString("fr-FR"),
    },
    {
      id: "actions",
      header: "Actions",
      headClassName: "text-right",
      cellClassName: "text-right",
      hideable: false,
      cell: (user, { refresh }) => (
        <div className="flex justify-end gap-1">
          <UserFormDialog
            mode="edit"
            user={{ id: user.id, name: user.name, email: user.email, role: user.role }}
            onMutated={refresh}
          />
          <DisableUserButton
            userId={user.id}
            userName={user.name}
            disabled={!!user.disabledAt}
            isSelf={user.id === currentUserId}
            onMutated={refresh}
          />
          <RemoveMemberButton
            userId={user.id}
            userName={user.name}
            isSelf={user.id === currentUserId}
            onMutated={refresh}
          />
        </div>
      ),
    },
  ]

  return (
    <DataTable
      ref={ref}
      columns={columns}
      initialData={initialUsers}
      initialTotal={initialTotal}
      pageSize={pageSize}
      getRowId={(user) => user.id}
      fetchPage={fetchPage}
      initialFilters={initialFilters}
      emptyMessage="Aucun utilisateur trouvé."
      stickyFirstColumn
      enableSearch
      searchPlaceholder="Rechercher par nom ou e-mail"
      enableExport
      exportFilename="utilisateurs.csv"
      onImport={importUsersAction}
      importHint="Colonnes attendues : name, email, password, role (user ou admin)."
      bulkActions={[
        {
          label: "Désactiver",
          icon: <ShieldOff className="h-4 w-4" />,
          variant: "destructive",
          confirm: (rows) => `Désactiver ${rows.length} utilisateur${rows.length > 1 ? "s" : ""} ?`,
          onClick: async (rows, { refresh }) => {
            await bulkSetUsersDisabledAction(
              rows.map((user) => user.id),
              true
            )
            refresh()
          },
        },
        {
          label: "Réactiver",
          icon: <ShieldCheck className="h-4 w-4" />,
          variant: "outline",
          onClick: async (rows, { refresh }) => {
            await bulkSetUsersDisabledAction(
              rows.map((user) => user.id),
              false
            )
            refresh()
          },
        },
      ]}
    />
  )
})
