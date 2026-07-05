import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { requireAdmin, type Role } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"
import { isValidRole } from "@/lib/user-validation"
import { Card, CardContent } from "@/components/ui/card"
import { UserEditForm } from "@/components/admin/user-edit-form"
import { PageHeader } from "@/components/admin/page-header"

export const metadata: Metadata = {
  title: "Modifier l'utilisateur",
  description: "Éditer un compte utilisateur.",
}

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const admin = await requireAdmin()
  const { id } = await params

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      disabledAt: true,
    },
  })

  if (!user) {
    notFound()
  }

  // Fall back to "user" if the stored role is somehow unknown (defensive).
  const role: Role = isValidRole(user.role) ? user.role : "user"

  return (
    <main className="mx-auto w-full max-w-lg p-6">
      <PageHeader
        title="Modifier l'utilisateur"
        description={user.email}
        backHref="/admin/users"
        backLabel="Retour à la liste"
      />
      <Card>
        <CardContent>
          <UserEditForm
            user={{
              id: user.id,
              name: user.name,
              email: user.email,
              role,
              disabled: !!user.disabledAt,
            }}
            isSelf={user.id === admin.id}
          />
        </CardContent>
      </Card>
    </main>
  )
}
