import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { getSession } from "@/lib/auth"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"

export const metadata: Metadata = {
  title: "Mot de passe oublié",
  description: "Demandez un lien de réinitialisation de votre mot de passe.",
}

export default async function ForgotPasswordPage() {
  const session = await getSession()
  if (session) {
    redirect("/dashboard")
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <ForgotPasswordForm />
    </main>
  )
}
