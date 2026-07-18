"use client"

import { useRef, type ReactNode } from "react"
import { PageHeader } from "@/components/layout/PageHeader"
import type { DataTableFetchContext, DataTableFilters, DataTableHandle, DataTablePage } from "@/components/data-table/DataTable"
import { InviteDialog } from "./InviteDialog"
import { InvitationsDataTable } from "./InvitationsDataTable"
import type { InvitationRow } from "./actions"

interface InvitationsPageClientProps {
  organizationName: string
  initialInvitations: InvitationRow[]
  initialTotal: number
  pageSize: number
  fetchPage: (page: number, context?: DataTableFetchContext) => Promise<DataTablePage<InvitationRow>>
  initialFilters?: DataTableFilters
  /**
   * Rendu entre l'en-tête et le DataTable (onglets + cartes de statistiques,
   * ITEM-080) — passé par `page.tsx` (Server Component), même composition
   * que `UsersPageClient`.
   */
  children?: ReactNode
}

/**
 * Enveloppe client autour de l'en-tête + du DataTable (ITEM-080, même
 * structure que `UsersPageClient`) : le bouton « Inviter » vit dans
 * `PageHeader.actions` (haut à droite, à côté du titre) et rafraîchit la
 * table après envoi via une référence impérative vers `DataTable`.
 */
export function InvitationsPageClient({
  organizationName,
  initialInvitations,
  initialTotal,
  pageSize,
  fetchPage,
  initialFilters,
  children,
}: InvitationsPageClientProps) {
  const tableRef = useRef<DataTableHandle>(null)

  return (
    <>
      <PageHeader
        title="Invitations"
        description={`Invitations envoyées par ${organizationName}`}
        actions={<InviteDialog onMutated={() => tableRef.current?.refresh()} />}
      />

      {children}

      <InvitationsDataTable
        ref={tableRef}
        initialInvitations={initialInvitations}
        initialTotal={initialTotal}
        pageSize={pageSize}
        fetchPage={fetchPage}
        initialFilters={initialFilters}
      />
    </>
  )
}
