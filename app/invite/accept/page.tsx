import type { Metadata } from "next"
import Link from "next/link"

import { prisma } from "@/lib/prisma"
import { invitationInvalidReason } from "@/lib/invitation"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { AcceptInvitationForm } from "@/components/invite/accept-invitation-form"

export const metadata: Metadata = {
  title: "Accepter l'invitation",
  description: "Rejoignez l'application via votre invitation.",
}

const INVALID_MESSAGE: Record<string, string> = {
  not_found: "Cette invitation est introuvable.",
  revoked: "Cette invitation a été révoquée.",
  accepted: "Cette invitation a déjà été utilisée.",
  expired: "Cette invitation a expiré.",
}

export default async function AcceptInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  const invitation = token
    ? await prisma.invitation.findUnique({ where: { token } })
    : null

  const reason = !token ? "not_found" : invitationInvalidReason(invitation)

  if (reason || !invitation) {
    return (
      <main className="flex min-h-svh items-center justify-center p-6">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Invitation invalide</CardTitle>
            <CardDescription>
              {INVALID_MESSAGE[reason ?? "not_found"] ??
                "Cette invitation ne peut pas être acceptée."}{" "}
              Aucun compte n&apos;a été créé.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Demandez à un administrateur de vous renvoyer une invitation.
            </p>
          </CardContent>
          <CardFooter>
            <Link
              href="/login"
              className="text-sm text-primary underline-offset-4 hover:underline"
            >
              Aller à la connexion
            </Link>
          </CardFooter>
        </Card>
      </main>
    )
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <AcceptInvitationForm token={token!} email={invitation.email} />
    </main>
  )
}
