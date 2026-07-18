import { requireAdmin } from "@/lib/authorization"
import { requireOrganization } from "@/lib/organization"
import { prisma } from "@/lib/prisma"
import { InvitationsPageClient } from "./InvitationsPageClient"
import { getInvitationsPageAction } from "./actions"
import { INVITATIONS_PAGE_SIZE } from "./page-size"
import { ListPageTabs, CategoryStatCards } from "@/components/crud"

interface AdminInvitationsPageProps {
  searchParams: Promise<{ status?: string }>
}

export default async function AdminInvitationsPage({ searchParams }: AdminInvitationsPageProps) {
  await requireAdmin()
  const organization = await requireOrganization()
  const { status = "" } = await searchParams

  // Scope à l'organisation active (ITEM-016) : un admin ne voit que les
  // invitations envoyées par SON organisation.
  const where = {
    organizationId: organization.id,
    ...(status ? { status } : {}),
  }

  // Comptes par catégorie (ITEM-080, cartes de statistiques) — toujours sur
  // l'ensemble de l'organisation, indépendamment du filtre `status`
  // actuellement sélectionné.
  const orgScope = { organizationId: organization.id }
  const [invitations, total, totalCount, pendingCount, acceptedCount, revokedCount] = await Promise.all([
    prisma.invitation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: INVITATIONS_PAGE_SIZE,
      select: { id: true, email: true, role: true, status: true, expiresAt: true },
    }),
    prisma.invitation.count({ where }),
    prisma.invitation.count({ where: orgScope }),
    prisma.invitation.count({ where: { ...orgScope, status: "pending" } }),
    prisma.invitation.count({ where: { ...orgScope, status: "accepted" } }),
    prisma.invitation.count({ where: { ...orgScope, status: "revoked" } }),
  ])

  return (
    <div className="flex flex-col gap-6">
      <InvitationsPageClient
        organizationName={organization.name}
        initialInvitations={invitations}
        initialTotal={total}
        pageSize={INVITATIONS_PAGE_SIZE}
        fetchPage={getInvitationsPageAction.bind(null, organization.id)}
        initialFilters={status ? { status } : undefined}
      >
        <ListPageTabs
          tabs={[
            { href: "/admin/users", label: "Utilisateurs" },
            { href: "/admin/invitations", label: "Invitations" },
          ]}
        />

        <CategoryStatCards
          basePath="/admin/invitations"
          paramName="status"
          activeValue={status || undefined}
          stats={[
            { label: "Tout", count: totalCount, value: null },
            { label: "En attente", count: pendingCount, value: "pending" },
            { label: "Acceptées", count: acceptedCount, value: "accepted" },
            { label: "Révoquées", count: revokedCount, value: "revoked" },
          ]}
        />
      </InvitationsPageClient>
    </div>
  )
}
