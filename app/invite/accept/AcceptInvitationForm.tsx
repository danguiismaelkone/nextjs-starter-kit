"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { acceptInvitationAction } from "./actions"
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
  USER_ALREADY_EXISTS: "Un compte existe déjà avec cet e-mail.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Un compte existe déjà avec cet e-mail.",
  PASSWORD_TOO_SHORT: `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`,
  PASSWORD_TOO_LONG: "Le mot de passe est trop long.",
}

interface FieldErrors {
  name?: string
  password?: string
  confirmPassword?: string
}

interface AcceptInvitationFormProps {
  token: string
  email: string
  role: string
}

export function AcceptInvitationForm({ token, email, role }: AcceptInvitationFormProps) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)

    const errors: FieldErrors = {}
    if (!name.trim()) errors.name = "Le nom est requis."
    if (password.length < MIN_PASSWORD_LENGTH) {
      errors.password = `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`
    }
    if (confirmPassword !== password) {
      errors.confirmPassword = "Les mots de passe ne correspondent pas."
    }
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setIsSubmitting(true)

    const { error: signUpError } = await authClient.signUp.email({ name, email, password })
    if (signUpError) {
      setIsSubmitting(false)
      setFormError(
        (signUpError.code && ERROR_MESSAGES[signUpError.code]) ||
          signUpError.message ||
          "Une erreur est survenue, veuillez réessayer."
      )
      return
    }

    const result = await acceptInvitationAction(token)
    setIsSubmitting(false)
    if (result.error) {
      setFormError(result.error)
      return
    }

    router.push("/dashboard")
    router.refresh()
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Rejoindre l&apos;application</CardTitle>
        <CardDescription>
          Vous avez été invité(e) en tant qu&apos;{role === "admin" ? "administrateur" : "utilisateur"}. Définissez
          votre nom et votre mot de passe.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-2">
            <Label>E-mail</Label>
            <p className="text-sm text-muted-foreground">{email}</p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nom</Label>
            <Input
              id="name"
              name="name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={!!fieldErrors.name}
            />
            {fieldErrors.name && <p className="text-sm text-destructive">{fieldErrors.name}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!fieldErrors.password}
            />
            {fieldErrors.password && <p className="text-sm text-destructive">{fieldErrors.password}</p>}
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
            {isSubmitting ? "Création du compte..." : "Créer mon compte"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
