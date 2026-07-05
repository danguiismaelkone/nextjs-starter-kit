"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { resetPassword } from "@/lib/auth-client"
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

const MIN_PASSWORD_LENGTH = 8

type FieldErrors = {
  password?: string
  confirmPassword?: string
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter()
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({})
  const [formError, setFormError] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  function validate(): FieldErrors {
    const errors: FieldErrors = {}
    if (!password) {
      errors.password = "Le mot de passe est requis."
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      errors.password = `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`
    }
    if (confirmPassword !== password) {
      errors.confirmPassword = "Les mots de passe ne correspondent pas."
    }
    return errors
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      return
    }

    setIsSubmitting(true)
    const { error } = await resetPassword({ newPassword: password, token })

    if (error) {
      // Typically an invalid/expired token — no password change occurred.
      setFormError(
        error.message ??
          "Ce lien de réinitialisation est invalide ou a expiré."
      )
      setIsSubmitting(false)
      return
    }

    router.push("/login")
    router.refresh()
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Nouveau mot de passe</CardTitle>
        <CardDescription>Choisissez un nouveau mot de passe.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          id="reset-password-form"
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-col gap-4"
        >
          {formError ? (
            <p
              role="alert"
              className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {formError}
            </p>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!fieldErrors.password}
              disabled={isSubmitting}
            />
            {fieldErrors.password ? (
              <p className="text-sm text-destructive">{fieldErrors.password}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              aria-invalid={!!fieldErrors.confirmPassword}
              disabled={isSubmitting}
            />
            {fieldErrors.confirmPassword ? (
              <p className="text-sm text-destructive">
                {fieldErrors.confirmPassword}
              </p>
            ) : null}
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-3">
        <Button
          type="submit"
          form="reset-password-form"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Mise à jour…" : "Réinitialiser le mot de passe"}
        </Button>
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
