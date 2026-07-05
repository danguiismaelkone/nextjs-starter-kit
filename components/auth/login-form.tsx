"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { signIn } from "@/lib/auth-client"
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
  email?: string
  password?: string
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Connected space to land on after a successful sign-in.
 */
const REDIRECT_TO = "/dashboard"

/**
 * Generic message shown for any authentication failure. Kept intentionally
 * vague so we never reveal whether an e-mail address exists.
 */
const INVALID_CREDENTIALS_MESSAGE = "E-mail ou mot de passe incorrect."

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({})
  const [formError, setFormError] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  function validate(): FieldErrors {
    const errors: FieldErrors = {}

    if (!email.trim()) {
      errors.email = "L'e-mail est requis."
    } else if (!EMAIL_REGEX.test(email)) {
      errors.email = "Format d'e-mail invalide."
    }
    if (!password) {
      errors.password = "Le mot de passe est requis."
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
    const { error } = await signIn.email({
      email: email.trim(),
      password,
    })

    if (error) {
      // Always show the same generic message regardless of the underlying
      // cause (unknown e-mail, wrong password, …) to avoid user enumeration.
      setFormError(INVALID_CREDENTIALS_MESSAGE)
      setIsSubmitting(false)
      return
    }

    router.push(REDIRECT_TO)
    router.refresh()
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Se connecter</CardTitle>
        <CardDescription>
          Entrez vos identifiants pour accéder à votre espace.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          id="login-form"
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
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!fieldErrors.email}
              disabled={isSubmitting}
            />
            {fieldErrors.email ? (
              <p className="text-sm text-destructive">{fieldErrors.email}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Mot de passe</Label>
              <Link
                href="/forgot-password"
                className="text-sm text-muted-foreground underline-offset-4 hover:underline"
              >
                Mot de passe oublié ?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!fieldErrors.password}
              disabled={isSubmitting}
            />
            {fieldErrors.password ? (
              <p className="text-sm text-destructive">{fieldErrors.password}</p>
            ) : null}
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-3">
        <Button type="submit" form="login-form" disabled={isSubmitting}>
          {isSubmitting ? "Connexion…" : "Se connecter"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Pas encore de compte ?{" "}
          <Link
            href="/register"
            className="text-primary underline-offset-4 hover:underline"
          >
            Créer un compte
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
