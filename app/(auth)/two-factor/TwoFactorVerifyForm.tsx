"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface TwoFactorVerifyFormProps {
  callbackUrl: string
}

/** Étape de vérification 2FA après connexion (ITEM-046) : code TOTP ou code de secours. */
export function TwoFactorVerifyForm({ callbackUrl }: TwoFactorVerifyFormProps) {
  const router = useRouter()
  const [code, setCode] = useState("")
  const [useBackupCode, setUseBackupCode] = useState(false)
  const [trustDevice, setTrustDevice] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (!code.trim()) {
      setError("Le code est requis.")
      return
    }

    setIsSubmitting(true)
    const { error: verifyError } = useBackupCode
      ? await authClient.twoFactor.verifyBackupCode({ code: code.trim() })
      : await authClient.twoFactor.verifyTotp({ code: code.trim(), trustDevice })
    setIsSubmitting(false)

    if (verifyError) {
      setError(verifyError.message ?? "Code invalide.")
      return
    }

    router.push(callbackUrl)
    router.refresh()
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Vérification en deux étapes</CardTitle>
        <CardDescription>
          {useBackupCode
            ? "Entrez l'un de vos codes de secours."
            : "Entrez le code à 6 chiffres généré par votre application d'authentification."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="two-factor-code">{useBackupCode ? "Code de secours" : "Code de vérification"}</Label>
            <Input
              id="two-factor-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoComplete="one-time-code"
              autoFocus
              aria-invalid={!!error}
            />
          </div>

          {!useBackupCode && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="trust-device"
                checked={trustDevice}
                onCheckedChange={(checked) => setTrustDevice(checked === true)}
              />
              <Label htmlFor="trust-device" className="text-sm font-normal">
                Faire confiance à cet appareil pendant 30 jours
              </Label>
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Vérification..." : "Vérifier"}
          </Button>

          <button
            type="button"
            className="text-center text-sm text-muted-foreground underline underline-offset-4"
            onClick={() => {
              setUseBackupCode((current) => !current)
              setCode("")
              setError(null)
            }}
          >
            {useBackupCode ? "Utiliser le code de l'application" : "Utiliser un code de secours"}
          </button>
        </form>
      </CardContent>
    </Card>
  )
}
