"use client"

import { useRef, type ReactNode } from "react"
import { PageHeader } from "@/components/layout/PageHeader"
import type { DataTableFetchContext, DataTableFilters, DataTableHandle, DataTablePage } from "@/components/data-table/DataTable"
import { UserFormDialog } from "./UserFormDialog"
import { UsersDataTable } from "./UsersDataTable"
import type { UserRow } from "./actions"

interface UsersPageClientProps {
  organizationName: string
  initialUsers: UserRow[]
  initialTotal: number
  pageSize: number
  currentUserId: string
  fetchPage: (page: number, context?: DataTableFetchContext) => Promise<DataTablePage<UserRow>>
  initialFilters?: DataTableFilters
  /**
   * Rendu entre l'en-tête et le DataTable (onglets + cartes de statistiques,
   * ITEM-077) — passé par `page.tsx` (Server Component) : un Server Component
   * peut être transmis en `children` à un Client Component sans devenir
   * lui-même client, il est déjà rendu par le serveur avant d'arriver ici.
   */
  children?: ReactNode
}

/**
 * Enveloppe client autour de l'en-tête + du DataTable (ITEM-079) : le bouton
 * « Nouvel utilisateur » vit dans `PageHeader.actions` (haut à droite, à
 * côté du titre) mais doit rafraîchir la table après création — un Server
 * Component (`page.tsx`) ne peut pas détenir de `ref`, d'où cette petite
 * enveloppe cliente partageant une référence impérative vers `DataTable`
 * entre les deux.
 */
export function UsersPageClient({
  organizationName,
  initialUsers,
  initialTotal,
  pageSize,
  currentUserId,
  fetchPage,
  initialFilters,
  children,
}: UsersPageClientProps) {
  const tableRef = useRef<DataTableHandle>(null)

  return (
    <>
      <PageHeader
        title="Utilisateurs"
        description={`Membres de ${organizationName}`}
        actions={<UserFormDialog mode="create" onMutated={() => tableRef.current?.refresh()} />}
      />

      {children}

      <UsersDataTable
        ref={tableRef}
        initialUsers={initialUsers}
        initialTotal={initialTotal}
        pageSize={pageSize}
        currentUserId={currentUserId}
        fetchPage={fetchPage}
        initialFilters={initialFilters}
      />
    </>
  )
}
