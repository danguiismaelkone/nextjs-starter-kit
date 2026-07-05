import type { Metadata } from "next"
import Link from "next/link"

import { ResetPasswordForm } from "@/components/auth/reset-password-form"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Réinitialiser le mot de passe",
  description: "Définissez un nouveau mot de passe.",
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>
}) {
  const { token, error } = await searchParams

  // The reset callback redirects here with `?error=...` for an invalid or
  // expired token, or with `?token=...` when the link is valid.
  if (error || !token) {
    return (
      <main className="flex min-h-svh items-center justify-center p-6">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Lien invalide</CardTitle>
            <CardDescription>
              Ce lien de réinitialisation est invalide ou a expiré. Aucun mot de
              passe n&apos;a été modifié.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Veuillez demander un nouveau lien de réinitialisation.
            </p>
          </CardContent>
          <CardFooter className="flex-col items-stretch gap-3">
            <Link
              href="/forgot-password"
              className="text-center text-sm text-primary underline-offset-4 hover:underline"
            >
              Demander un nouveau lien
            </Link>
          </CardFooter>
        </Card>
      </main>
    )
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <ResetPasswordForm token={token} />
    </main>
  )
}
