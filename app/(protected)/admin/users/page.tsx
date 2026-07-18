import { requireAdmin } from "@/lib/authorization"
import { requireOrganization } from "@/lib/organization"
import { prisma } from "@/lib/prisma"
import { UsersPageClient } from "./UsersPageClient"
import { getUsersPageAction } from "./actions"
import { USERS_PAGE_SIZE } from "./page-size"
import { ListPageTabs, CategoryStatCards } from "@/components/crud"

interface AdminUsersPageProps {
  searchParams: Promise<{ status?: string }>
}

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const session = await requireAdmin()
  const organization = await requireOrganization()
  const { status = "" } = await searchParams

  // Scope à l'organisation active (ITEM-016) : un admin ne voit et ne gère que
  // les membres de SON organisation, jamais ceux d'une autre. La recherche
  // texte (nom/e-mail) est désormais intégrée au DataTable lui-même (ITEM-079,
  // chip de recherche) plutôt que dérivée de l'URL ici.
  const where = {
    memberships: { some: { organizationId: organization.id, status: "active" } },
    ...(status === "active" ? { disabledAt: null } : {}),
    ...(status === "disabled" ? { disabledAt: { not: null } } : {}),
  }

  // Comptes par catégorie (ITEM-077, cartes de statistiques) — toujours sur
  // l'ensemble de l'organisation, indépendamment du filtre `status`
  // actuellement sélectionné (mêmes totaux quelle que soit la carte active).
  const membershipScope = { memberships: { some: { organizationId: organization.id, status: "active" } } }
  const [users, total, totalCount, activeCount, disabledCount] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: USERS_PAGE_SIZE,
      select: { id: true, name: true, email: true, role: true, disabledAt: true, createdAt: true },
    }),
    prisma.user.count({ where }),
    prisma.user.count({ where: membershipScope }),
    prisma.user.count({ where: { ...membershipScope, disabledAt: null } }),
    prisma.user.count({ where: { ...membershipScope, disabledAt: { not: null } } }),
  ])

  return (
    <div className="flex flex-col gap-6">
      <UsersPageClient
        organizationName={organization.name}
        initialUsers={users}
        initialTotal={total}
        pageSize={USERS_PAGE_SIZE}
        currentUserId={session.user.id}
        fetchPage={getUsersPageAction.bind(null, organization.id)}
        initialFilters={status ? { status } : undefined}
      >
        <ListPageTabs
          tabs={[
            { href: "/admin/users", label: "Utilisateurs" },
            { href: "/admin/invitations", label: "Invitations" },
          ]}
        />

        <CategoryStatCards
          basePath="/admin/users"
          paramName="status"
          activeValue={status || undefined}
          stats={[
            { label: "Tout", count: totalCount, value: null },
            { label: "Actifs", count: activeCount, value: "active" },
            { label: "Désactivés", count: disabledCount, value: "disabled" },
          ]}
        />
      </UsersPageClient>
    </div>
  )
}
