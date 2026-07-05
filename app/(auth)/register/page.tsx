import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { getSession } from "@/lib/auth"
import { RegisterForm } from "@/components/auth/register-form"

export const metadata: Metadata = {
  title: "Créer un compte",
  description: "Créez votre compte pour accéder à l'application.",
}

export default async function RegisterPage() {
  const session = await getSession()
  if (session) {
    redirect("/")
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <RegisterForm />
    </main>
  )
}
