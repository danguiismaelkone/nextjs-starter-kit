import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { AcceptInvitationForm } from "./AcceptInvitationForm"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface InviteAcceptPageProps {
  searchParams: Promise<{ token?: string }>
}

export default async function InviteAcceptPage({ searchParams }: InviteAcceptPageProps) {
  const { token } = await searchParams

  const invitation = token ? await prisma.invitation.findUnique({ where: { token } }) : null
  const isValid = !!invitation && invitation.status === "pending" && invitation.expiresAt > new Date()

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      {isValid && invitation ? (
        <AcceptInvitationForm token={invitation.token} email={invitation.email} role={invitation.role} />
      ) : (
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Invitation invalide</CardTitle>
            <CardDescription>Ce lien d&apos;invitation est invalide, a expiré ou a déjà été utilisé.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login" className="text-sm font-medium text-foreground underline underline-offset-4">
              Retour à la connexion
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
