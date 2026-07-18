"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import QRCode from "react-qr-code"
import { ShieldCheck, ShieldOff } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface TwoFactorSectionProps {
  initialEnabled: boolean
}

type EnableStep = "password" | "confirm"

/** Section « Sécurité » — activation/désactivation de la 2FA TOTP (ITEM-046, plugin Better Auth `twoFactor`). */
export function TwoFactorSection({ initialEnabled }: TwoFactorSectionProps) {
  const router = useRouter()
  const [enabled, setEnabled] = useState(initialEnabled)

  const [enableOpen, setEnableOpen] = useState(false)
  const [enableStep, setEnableStep] = useState<EnableStep>("password")
  const [password, setPassword] = useState("")
  const [totpUri, setTotpUri] = useState<string | null>(null)
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null)
  const [code, setCode] = useState("")

  const [disableOpen, setDisableOpen] = useState(false)
  const [disablePassword, setDisablePassword] = useState("")

  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function resetEnableFlow() {
    setEnableStep("password")
    setPassword("")
    setTotpUri(null)
    setBackupCodes(null)
    setCode("")
    setError(null)
  }

  async function handleStartEnable() {
    if (!password) {
      setError("Le mot de passe est requis.")
      return
    }
    setIsPending(true)
    setError(null)
    const { data, error: enableError } = await authClient.twoFactor.enable({ password })
    setIsPending(false)

    if (enableError) {
      setError(enableError.message ?? "Échec de l'activation.")
      return
    }

    setTotpUri(data?.totpURI ?? null)
    setBackupCodes(data?.backupCodes ?? null)
    setEnableStep("confirm")
  }

  async function handleConfirmEnable() {
    if (!code.trim()) {
      setError("Le code est requis.")
      return
    }
    setIsPending(true)
    setError(null)
    const { error: verifyError } = await authClient.twoFactor.verifyTotp({ code: code.trim() })
    setIsPending(false)

    if (verifyError) {
      setError(verifyError.message ?? "Code invalide.")
      return
    }

    setEnabled(true)
    setEnableOpen(false)
    resetEnableFlow()
    router.refresh()
  }

  async function handleDisable() {
    if (!disablePassword) {
      setError("Le mot de passe est requis.")
      return
    }
    setIsPending(true)
    setError(null)
    const { error: disableError } = await authClient.twoFactor.disable({ password: disablePassword })
    setIsPending(false)

    if (disableError) {
      setError(disableError.message ?? "Échec de la désactivation.")
      return
    }

    setEnabled(false)
    setDisableOpen(false)
    setDisablePassword("")
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Double authentification (2FA)</CardTitle>
        <CardDescription>Protégez votre compte avec un code généré par une application d&apos;authentification.</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4">
        <Badge variant={enabled ? "default" : "outline"}>
          {enabled ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldOff className="h-3.5 w-3.5" />}
          {enabled ? "Activée" : "Désactivée"}
        </Badge>

        {enabled ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setError(null)
              setDisableOpen(true)
            }}
          >
            Désactiver
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={() => {
              resetEnableFlow()
              setEnableOpen(true)
            }}
          >
            Activer
          </Button>
        )}
      </CardContent>

      <Dialog open={enableOpen} onOpenChange={(open) => (open ? setEnableOpen(true) : (setEnableOpen(false), resetEnableFlow()))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Activer la double authentification</DialogTitle>
            <DialogDescription>
              {enableStep === "password"
                ? "Confirmez votre mot de passe pour commencer."
                : "Scannez le QR code avec votre application d'authentification, puis entrez le code généré."}
            </DialogDescription>
          </DialogHeader>

          {enableStep === "password" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="enable-2fa-password">Mot de passe</Label>
              <Input
                id="enable-2fa-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoFocus
              />
            </div>
          )}

          {enableStep === "confirm" && (
            <div className="flex flex-col gap-4">
              {totpUri && (
                <div className="flex justify-center rounded-md border bg-white p-4">
                  <QRCode value={totpUri} size={180} />
                </div>
              )}

              {backupCodes && backupCodes.length > 0 && (
                <div className="rounded-md border bg-muted/40 p-3 text-sm">
                  <p className="mb-2 font-medium text-foreground">Codes de secours — conservez-les en lieu sûr :</p>
                  <ul className="grid grid-cols-2 gap-1 font-mono text-xs">
                    {backupCodes.map((backupCode) => (
                      <li key={backupCode}>{backupCode}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Label htmlFor="enable-2fa-code">Code de vérification</Label>
                <Input
                  id="enable-2fa-code"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  autoComplete="one-time-code"
                  autoFocus
                />
              </div>
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            {enableStep === "password" ? (
              <Button type="button" onClick={handleStartEnable} disabled={isPending}>
                {isPending ? "..." : "Continuer"}
              </Button>
            ) : (
              <Button type="button" onClick={handleConfirmEnable} disabled={isPending}>
                {isPending ? "Vérification..." : "Confirmer"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={disableOpen}
        onOpenChange={(open) => {
          setDisableOpen(open)
          if (!open) {
            setDisablePassword("")
            setError(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Désactiver la double authentification</DialogTitle>
            <DialogDescription>Confirmez votre mot de passe pour désactiver la 2FA.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="disable-2fa-password">Mot de passe</Label>
            <Input
              id="disable-2fa-password"
              type="password"
              autoComplete="current-password"
              value={disablePassword}
              onChange={(event) => setDisablePassword(event.target.value)}
              autoFocus
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="destructive" onClick={handleDisable} disabled={isPending}>
              {isPending ? "..." : "Désactiver"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
