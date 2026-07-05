import type { Metadata } from "next"

import { requireAdmin } from "@/lib/authorization"
import { Card, CardContent } from "@/components/ui/card"
import { UserCreateForm } from "@/components/admin/user-create-form"
import { PageHeader } from "@/components/admin/page-header"

export const metadata: Metadata = {
  title: "Nouvel utilisateur",
  description: "Créer un compte utilisateur.",
}

export default async function NewUserPage() {
  await requireAdmin()

  return (
    <main className="mx-auto w-full max-w-lg p-6">
      <PageHeader
        title="Nouvel utilisateur"
        description="Créez un compte avec un mot de passe initial. L'utilisateur pourra se connecter immédiatement."
        backHref="/admin/users"
        backLabel="Retour à la liste"
      />
      <Card>
        <CardContent>
          <UserCreateForm />
        </CardContent>
      </Card>
    </main>
  )
}
