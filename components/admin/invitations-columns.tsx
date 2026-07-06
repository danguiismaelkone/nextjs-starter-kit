"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Send, Trash2 } from "lucide-react"

import {
  resendInvitation,
  revokeInvitation,
} from "@/app/admin/users/invitations/actions"
import { invitationInvalidReason } from "@/lib/invitation"
import { DataTable } from "@/components/data-table"
import type { ColumnDef, RowAction } from "@/components/data-table"
import { InvitationCreateDialog } from "@/components/admin/invitation-create-dialog"

/** Raw invitation shape passed from the server page. */
export type AdminInvitation = {
  id: string
  email: string
  role: string
  status: string
  expiresAt: Date | string
  createdAt: Date | string
}

type DisplayStatus = "pending" | "accepted" | "revoked" | "expired"

/** Row model with a display status derived from persisted status + expiry. */
type InvitationRow = AdminInvitation & {
  displayStatus: DisplayStatus
  actionable: boolean
}

const COLUMNS: ColumnDef<InvitationRow>[] = [
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
    key: "displayStatus",
    label: "Statut",
    type: "badge",
    filterable: true,
    badgeMap: {
      pending: {
        label: "En attente",
        className: "border-amber-200 bg-amber-50 text-amber-700",
      },
      accepted: {
        label: "Acceptée",
        className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      },
      revoked: {
        label: "Révoquée",
        className: "border-border bg-muted text-muted-foreground",
      },
      expired: {
        label: "Expirée",
        className: "border-red-200 bg-red-50 text-red-700",
      },
    },
  },
  {
    key: "expiresAt",
    label: "Expire le",
    type: "date",
    sortable: true,
    filterable: true,
  },
]

function deriveStatus(invitation: AdminInvitation): {
  displayStatus: DisplayStatus
  actionable: boolean
} {
  const expiresAt = new Date(invitation.expiresAt)
  const reason = invitationInvalidReason({ status: invitation.status, expiresAt })

  let displayStatus: DisplayStatus
  if (invitation.status === "accepted") displayStatus = "accepted"
  else if (invitation.status === "revoked") displayStatus = "revoked"
  else if (reason === "expired") displayStatus = "expired"
  else displayStatus = "pending"

  return {
    displayStatus,
    actionable: invitation.status === "pending" && reason === null,
  }
}

export function InvitationsTable({
  invitations,
}: {
  invitations: AdminInvitation[]
}) {
  const router = useRouter()

  const rows: InvitationRow[] = React.useMemo(
    () =>
      invitations.map((invitation) => ({
        ...invitation,
        ...deriveStatus(invitation),
      })),
    [invitations],
  )

  async function handleResend(row: InvitationRow) {
    const result = await resendInvitation(row.id)
    if (!result.ok) {
      window.alert(result.error)
      return
    }
    router.refresh()
  }

  async function handleRevoke(row: InvitationRow) {
    if (!window.confirm(`Révoquer l'invitation de ${row.email} ?`)) return
    const result = await revokeInvitation(row.id)
    if (!result.ok) {
      window.alert(result.error)
      return
    }
    router.refresh()
  }

  const actions: RowAction<InvitationRow>[] = [
    {
      label: "Renvoyer",
      icon: <Send className="size-4" />,
      onClick: handleResend,
      hidden: (row) => !row.actionable,
    },
    {
      label: "Révoquer",
      icon: <Trash2 className="size-4" />,
      variant: "destructive",
      onClick: handleRevoke,
      hidden: (row) => !row.actionable,
    },
  ]

  return (
    <DataTable<InvitationRow>
      columns={COLUMNS}
      data={rows}
      rowKey="id"
      actions={actions}
      createSlot={<InvitationCreateDialog />}
      defaultPageSize={10}
      emptyState={{
        title: "Aucune invitation",
        description: "Invitez une personne pour la voir apparaître ici.",
      }}
    />
  )
}
