"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Ban, Pencil, RotateCcw } from "lucide-react"

import { setUserDisabled } from "@/app/admin/users/actions"
import { DataTable } from "@/components/data-table"
import type { ColumnDef, RowAction } from "@/components/data-table"

/** Raw user shape passed from the server page. */
export type AdminUser = {
  id: string
  name: string
  email: string
  role: string
  disabledAt: Date | string | null
  createdAt: Date | string
}

/** Row model consumed by the table (adds a derived `status`). */
type UserRow = AdminUser & { status: "active" | "disabled" }

const COLUMNS: ColumnDef<UserRow>[] = [
  { key: "name", label: "Nom", type: "text", sortable: true, filterable: true },
  {
    key: "email",
    label: "E-mail",
    type: "text",
    sortable: true,
    filterable: true,
  },
  {
    key: "role",
    label: "Rôle",
    type: "badge",
    filterable: true,
    badgeMap: {
      admin: {
        label: "Admin",
        className: "border-indigo-200 bg-indigo-50 text-indigo-700",
      },
      user: {
        label: "Utilisateur",
        className: "border-border bg-muted text-muted-foreground",
      },
    },
  },
  {
    key: "status",
    label: "Statut",
    type: "badge",
    filterable: true,
    badgeMap: {
      active: {
        label: "Actif",
        className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      },
      disabled: {
        label: "Désactivé",
        className: "border-red-200 bg-red-50 text-red-700",
      },
    },
  },
  {
    key: "createdAt",
    label: "Créé le",
    type: "date",
    sortable: true,
    filterable: true,
  },
]

export function UsersTable({
  users,
  currentUserId,
}: {
  users: AdminUser[]
  currentUserId: string
}) {
  const router = useRouter()

  const rows: UserRow[] = React.useMemo(
    () =>
      users.map((u) => ({
        ...u,
        status: u.disabledAt ? "disabled" : "active",
      })),
    [users],
  )

  async function toggleDisabled(row: UserRow) {
    const nextDisabled = row.status === "active"
    const confirmed = window.confirm(
      nextDisabled
        ? `Désactiver le compte de ${row.email} ? Ses sessions seront révoquées.`
        : `Réactiver le compte de ${row.email} ?`,
    )
    if (!confirmed) return

    const result = await setUserDisabled(row.id, nextDisabled)
    if (!result.ok) {
      window.alert(result.error)
      return
    }
    router.refresh()
  }

  const actions: RowAction<UserRow>[] = [
    {
      label: "Modifier",
      icon: <Pencil className="size-4" />,
      onClick: (row) => router.push(`/admin/users/${row.id}`),
    },
    {
      label: "Désactiver",
      icon: <Ban className="size-4" />,
      variant: "destructive",
      onClick: toggleDisabled,
      // Self-disable is blocked (server-guarded too); hide when active-self.
      hidden: (row) => row.status !== "active" || row.id === currentUserId,
    },
    {
      label: "Réactiver",
      icon: <RotateCcw className="size-4" />,
      onClick: toggleDisabled,
      hidden: (row) => row.status !== "disabled",
    },
  ]

  return (
    <DataTable<UserRow>
      columns={COLUMNS}
      data={rows}
      rowKey="id"
      actions={actions}
      onRowClick={(row) => router.push(`/admin/users/${row.id}`)}
      createHref="/admin/users/new"
      createLabel="Nouvel utilisateur"
      defaultPageSize={10}
      emptyState={{
        title: "Aucun utilisateur",
        description: "Aucun compte ne correspond à votre recherche.",
      }}
    />
  )
}
