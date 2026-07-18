"use client"

import { Suspense, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
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

const MIN_PASSWORD_LENGTH = 8

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_TOKEN: "Ce lien de réinitialisation est invalide ou a expiré.",
  PASSWORD_TOO_SHORT: `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`,
  PASSWORD_TOO_LONG: "Le mot de passe est trop long.",
}

interface FieldErrors {
  password?: string
  confirmPassword?: string
}

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const linkError = searchParams.get("error")

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const invalidLink = !token || !!linkError

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)

    const errors: FieldErrors = {}
    if (password.length < MIN_PASSWORD_LENGTH) {
      errors.password = `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`
    }
    if (confirmPassword !== password) {
      errors.confirmPassword = "Les mots de passe ne correspondent pas."
    }
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0 || !token) return

    setIsSubmitting(true)
    const { error } = await authClient.resetPassword({ newPassword: password, token })
    setIsSubmitting(false)

    if (error) {
      setFormError((error.code && ERROR_MESSAGES[error.code]) || error.message || "Une erreur est survenue, veuillez réessayer.")
      return
    }

    setSuccess(true)
    setTimeout(() => router.push("/login"), 1500)
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Nouveau mot de passe</CardTitle>
        <CardDescription>Choisissez un nouveau mot de passe pour votre compte.</CardDescription>
      </CardHeader>
      <CardContent>
        {success ? (
          <p className="text-sm text-muted-foreground">
            Mot de passe mis à jour. Redirection vers la connexion...
          </p>
        ) : invalidLink ? (
          <div className="flex flex-col gap-4">
            <p role="alert" className="text-sm text-destructive">
              {ERROR_MESSAGES.INVALID_TOKEN}
            </p>
            <Link href="/forgot-password" className="text-sm font-medium text-foreground underline underline-offset-4">
              Demander un nouveau lien
            </Link>
          </div>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Nouveau mot de passe</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!fieldErrors.password}
              />
              {fieldErrors.password && (
                <p className="text-sm text-destructive">{fieldErrors.password}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                aria-invalid={!!fieldErrors.confirmPassword}
              />
              {fieldErrors.confirmPassword && (
                <p className="text-sm text-destructive">{fieldErrors.confirmPassword}</p>
              )}
            </div>

            {formError && (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Mise à jour..." : "Réinitialiser le mot de passe"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
}
