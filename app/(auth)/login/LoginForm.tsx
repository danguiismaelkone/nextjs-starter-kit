"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
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

const INVALID_CREDENTIALS_MESSAGE = "E-mail ou mot de passe incorrect."
const SSO_NO_PROVIDER_MESSAGE = "Aucune connexion SSO n'est configurée pour ce domaine."

interface FieldErrors {
  email?: string
  password?: string
}

interface LoginFormProps {
  /** Où rediriger après connexion réussie — déjà validé (chemin interne) par la page. */
  callbackUrl?: string
}

export function LoginForm({ callbackUrl = "/dashboard" }: LoginFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSso, setShowSso] = useState(false)
  const [ssoEmail, setSsoEmail] = useState("")
  const [ssoError, setSsoError] = useState<string | null>(null)
  const [isSsoSubmitting, setIsSsoSubmitting] = useState(false)

  function validate(): FieldErrors {
    const errors: FieldErrors = {}
    if (!email.trim()) errors.email = "L'e-mail est requis."
    if (!password) errors.password = "Le mot de passe est requis."
    return errors
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)

    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setIsSubmitting(true)
    const { data, error } = await authClient.signIn.email({ email, password })
    setIsSubmitting(false)

    if (error) {
      // Message volontairement générique : ne pas indiquer si l'e-mail existe.
      setFormError(INVALID_CREDENTIALS_MESSAGE)
      return
    }

    // 2FA activée (ITEM-046) : aucune session n'a été créée, l'identifiant/mot
    // de passe seuls ne suffisent pas encore — l'utilisateur doit d'abord
    // valider un code TOTP sur /two-factor. Le plugin renvoie ce champ en
    // modifiant la réponse de `/sign-in/email` par un hook plutôt qu'en
    // déclarant son propre endpoint : le type de `data` du client de base ne
    // le reflète pas, d'où la vérification via `in` plutôt qu'un accès direct.
    if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) {
      router.push(`/two-factor?callbackUrl=${encodeURIComponent(callbackUrl)}`)
      return
    }

    router.push(callbackUrl)
    router.refresh()
  }

  async function handleSsoSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSsoError(null)

    if (!ssoEmail.trim()) {
      setSsoError("L'e-mail professionnel est requis.")
      return
    }

    setIsSsoSubmitting(true)
    // En cas de succès, `authClient` redirige automatiquement le navigateur
    // vers l'URL d'autorisation du fournisseur (`redirectPlugin` interne à
    // better-auth, déclenché par `{ url, redirect: true }`) — aucune
    // navigation manuelle nécessaire ici.
    const { error } = await authClient.signIn.sso({
      email: ssoEmail,
      callbackURL: callbackUrl,
    })
    setIsSsoSubmitting(false)

    if (error) {
      setSsoError(SSO_NO_PROVIDER_MESSAGE)
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Se connecter</CardTitle>
        <CardDescription>Accédez à votre espace avec votre e-mail et votre mot de passe.</CardDescription>
      </CardHeader>
      <CardContent>
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
              aria-invalid={!!fieldErrors.email}
            />
            {fieldErrors.email && (
              <p className="text-sm text-destructive">{fieldErrors.email}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Mot de passe</Label>
              <Link href="/forgot-password" className="text-sm text-muted-foreground underline underline-offset-4">
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
            />
            {fieldErrors.password && (
              <p className="text-sm text-destructive">{fieldErrors.password}</p>
            )}
          </div>

          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Connexion..." : "Se connecter"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Pas encore de compte ?{" "}
            <Link href="/register" className="font-medium text-foreground underline underline-offset-4">
              Créer un compte
            </Link>
          </p>
        </form>

        <div className="mt-4 border-t pt-4">
          {showSso ? (
            <form className="flex flex-col gap-3" onSubmit={handleSsoSubmit} noValidate>
              <div className="flex flex-col gap-2">
                <Label htmlFor="ssoEmail">E-mail professionnel</Label>
                <Input
                  id="ssoEmail"
                  name="ssoEmail"
                  type="email"
                  autoComplete="email"
                  placeholder="vous@entreprise.com"
                  value={ssoEmail}
                  onChange={(e) => setSsoEmail(e.target.value)}
                  aria-invalid={!!ssoError}
                />
              </div>
              {ssoError && (
                <p role="alert" className="text-sm text-destructive">
                  {ssoError}
                </p>
              )}
              <Button type="submit" variant="outline" className="w-full" disabled={isSsoSubmitting}>
                {isSsoSubmitting ? "Redirection..." : "Continuer avec le SSO"}
              </Button>
            </form>
          ) : (
            <Button type="button" variant="outline" className="w-full" onClick={() => setShowSso(true)}>
              Se connecter avec le SSO de mon entreprise
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
