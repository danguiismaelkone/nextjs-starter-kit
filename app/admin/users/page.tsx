import type { Metadata } from "next"

import { requireAdmin } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/admin/page-header"
import { UsersTabs } from "@/components/admin/users-tabs"

export const metadata: Metadata = {
  title: "Utilisateurs",
  description: "Gestion des comptes utilisateurs et des invitations.",
}

export default async function AdminUsersPage() {
  const admin = await requireAdmin()

  // Both lists are fetched here: the page hosts the Utilisateurs and Invitations
  // tabs (ITEM-015). Client-side DataTables handle search/sort/filter/pagination,
  // so the full (bounded) sets are fetched — fine for the modest admin base.
  const [users, invitations] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        disabledAt: true,
        createdAt: true,
      },
    }),
    // Pending first, then most recent activity. Accepted/revoked kept for history.
    prisma.invitation.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 200,
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        expiresAt: true,
        createdAt: true,
      },
    }),
  ])

  return (
    <main className="mx-auto w-full max-w-5xl p-6">
      <PageHeader
        title="Utilisateurs"
        description="Gérez les comptes et les invitations depuis les onglets ci-dessous."
      />
      <UsersTabs
        users={users}
        invitations={invitations}
        currentUserId={admin.id}
      />
    </main>
  )
}
