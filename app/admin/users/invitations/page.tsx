import type { Metadata } from "next"
import Link from "next/link"

import { requireAdmin } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { InvitationCreateForm } from "@/components/admin/invitation-create-form"
import { InvitationsTable } from "@/components/admin/invitations-columns"
import { PageHeader } from "@/components/admin/page-header"

export const metadata: Metadata = {
  title: "Invitations",
  description: "Inviter et gérer les invitations d'utilisateurs.",
}

export default async function InvitationsPage() {
  await requireAdmin()

  // Pending first, then most recent activity. Accepted/revoked kept for history.
  const invitations = await prisma.invitation.findMany({
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
  })

  return (
    <main className="mx-auto w-full max-w-5xl p-6">
      <PageHeader
        title="Invitations"
        description="Invitez une personne par e-mail à créer son compte."
        actions={
          <Button variant="outline" asChild>
            <Link href="/admin/users">Retour aux utilisateurs</Link>
          </Button>
        }
      />

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Inviter un utilisateur</CardTitle>
          <CardDescription>
            L&apos;invité recevra un lien pour définir son mot de passe et
            rejoindre l&apos;application avec le rôle choisi.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InvitationCreateForm />
        </CardContent>
      </Card>

      <h2 className="mb-3 text-sm font-medium text-muted-foreground">
        Invitations récentes
      </h2>
      <InvitationsTable invitations={invitations} />
    </main>
  )
}
