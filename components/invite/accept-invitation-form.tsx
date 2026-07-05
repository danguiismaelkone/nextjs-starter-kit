"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { acceptInvitation } from "@/app/invite/accept/actions"
import { signIn } from "@/lib/auth-client"
import { MIN_PASSWORD_LENGTH } from "@/lib/user-validation"
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

type FieldErrors = {
  name?: string
  password?: string
  confirmPassword?: string
}

const REDIRECT_TO = "/dashboard"

export function AcceptInvitationForm({
  token,
  email,
}: {
  token: string
  email: string
}) {
  const router = useRouter()
  const [name, setName] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({})
  const [formError, setFormError] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  function validate(): FieldErrors {
    const errors: FieldErrors = {}
    if (!name.trim()) {
      errors.name = "Le nom est requis."
    }
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
    const result = await acceptInvitation({ token, name: name.trim(), password })

    if (!result.ok) {
      setFormError(result.error)
      setIsSubmitting(false)
      return
    }

    // Account created server-side; sign the invitee in on their browser.
    const { error } = await signIn.email({ email: result.email, password })
    if (error) {
      // Account exists but auto sign-in failed — let them log in manually.
      router.push("/login")
      return
    }

    router.push(REDIRECT_TO)
    router.refresh()
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Accepter l&apos;invitation</CardTitle>
        <CardDescription>
          Créez votre compte pour {email}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          id="accept-invitation-form"
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
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" value={email} disabled readOnly />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nom</Label>
            <Input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={!!fieldErrors.name}
              disabled={isSubmitting}
            />
            {fieldErrors.name ? (
              <p className="text-sm text-destructive">{fieldErrors.name}</p>
            ) : null}
          </div>

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
      <CardFooter>
        <Button
          type="submit"
          form="accept-invitation-form"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Création…" : "Rejoindre l'application"}
        </Button>
      </CardFooter>
    </Card>
  )
}
