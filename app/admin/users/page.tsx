import type { Metadata } from "next"
import Link from "next/link"

import { requireAdmin } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/admin/page-header"
import { UsersTable } from "@/components/admin/users-columns"

export const metadata: Metadata = {
  title: "Utilisateurs",
  description: "Gestion des comptes utilisateurs.",
}

export default async function AdminUsersPage() {
  const admin = await requireAdmin()

  // Client-side DataTable handles search / sort / filter / pagination, so the
  // full (bounded) set is fetched. Fine for the modest admin user base; switch
  // the table to `serverSide` if this ever needs to scale.
  const users = await prisma.user.findMany({
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
  })

  return (
    <main className="mx-auto w-full max-w-5xl p-6">
      <PageHeader
        title="Utilisateurs"
        description={`${users.length} compte${users.length > 1 ? "s" : ""} au total.`}
        actions={
          <Button variant="outline" asChild>
            <Link href="/admin/users/invitations">Invitations</Link>
          </Button>
        }
      />
      <UsersTable users={users} currentUserId={admin.id} />
    </main>
  )
}
