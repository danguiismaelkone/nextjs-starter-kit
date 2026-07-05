"use client"

import * as React from "react"
import Link from "next/link"

import { requestPasswordReset } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Client route the reset link redirects to (with a `token` query param). */
const RESET_REDIRECT_TO = "/reset-password"

/**
 * Neutral confirmation shown after any submission, whether or not the e-mail
 * exists, to avoid disclosing account existence.
 */
const NEUTRAL_MESSAGE =
  "Si un compte est associé à cette adresse, vous recevrez un e-mail avec un lien de réinitialisation."

export function ForgotPasswordForm() {
  const [email, setEmail] = React.useState("")
  const [fieldError, setFieldError] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [submitted, setSubmitted] = React.useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFieldError(null)

    if (!email.trim()) {
      setFieldError("L'e-mail est requis.")
      return
    }
    if (!EMAIL_REGEX.test(email)) {
      setFieldError("Format d'e-mail invalide.")
      return
    }

    setIsSubmitting(true)
    // Better Auth returns a neutral response even when the e-mail is unknown,
    // so we always land on the same confirmation state regardless of outcome.
    await requestPasswordReset({
      email: email.trim(),
      redirectTo: RESET_REDIRECT_TO,
    })
    setSubmitted(true)
    setIsSubmitting(false)
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Mot de passe oublié</CardTitle>
        <CardDescription>
          Entrez votre e-mail pour recevoir un lien de réinitialisation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {submitted ? (
          <p
            role="status"
            className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground"
          >
            {NEUTRAL_MESSAGE}
          </p>
        ) : (
          <form
            id="forgot-password-form"
            onSubmit={handleSubmit}
            noValidate
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!fieldError}
                disabled={isSubmitting}
              />
              {fieldError ? (
                <p className="text-sm text-destructive">{fieldError}</p>
              ) : null}
            </div>
          </form>
        )}
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-3">
        {!submitted ? (
          <Button
            type="submit"
            form="forgot-password-form"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Envoi…" : "Envoyer le lien"}
          </Button>
        ) : null}
        <p className="text-center text-sm text-muted-foreground">
          <Link
            href="/login"
            className="text-primary underline-offset-4 hover:underline"
          >
            Retour à la connexion
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
