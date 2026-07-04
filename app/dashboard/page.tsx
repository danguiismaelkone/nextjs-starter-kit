import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { getSession } from "@/lib/auth"
import { LogoutButton } from "@/components/auth/logout-button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Tableau de bord",
  description: "Votre espace connecté.",
}

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Tableau de bord</CardTitle>
          <CardDescription>
            Bienvenue, {session.user.name || session.user.email}.
          </CardDescription>
          <CardAction>
            <LogoutButton />
          </CardAction>
        </CardHeader>
        <CardContent>
          Vous êtes connecté avec l&apos;adresse {session.user.email}.
        </CardContent>
      </Card>
    </main>
  )
}
