"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const NEUTRAL_MESSAGE =
  "Si un compte existe avec cet e-mail, un lien de réinitialisation vient de lui être envoyé."

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!EMAIL_REGEX.test(email)) {
      setFieldError("Adresse e-mail invalide.")
      return
    }
    setFieldError(null)
    setIsSubmitting(true)

    // Le message affiché reste neutre quel que soit le résultat (pas de divulgation).
    await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" })

    setIsSubmitting(false)
    setSubmitted(true)
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Mot de passe oublié</CardTitle>
          <CardDescription>
            Saisissez votre e-mail pour recevoir un lien de réinitialisation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <p className="text-sm text-muted-foreground">{NEUTRAL_MESSAGE}</p>
          ) : (
            <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={!!fieldError}
                />
                {fieldError && <p className="text-sm text-destructive">{fieldError}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Envoi..." : "Envoyer le lien"}
              </Button>
            </form>
          )}

          <p className="mt-4 text-center text-sm text-muted-foreground">
            <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
              Retour à la connexion
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
