"use client"

import { useState, type FormEvent } from "react"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const MIN_PASSWORD_LENGTH = 8

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_PASSWORD: "Mot de passe actuel incorrect.",
  PASSWORD_TOO_SHORT: `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`,
  PASSWORD_TOO_LONG: "Le mot de passe est trop long.",
}

interface FieldErrors {
  currentPassword?: string
  newPassword?: string
  confirmPassword?: string
}

/**
 * Changement de mot de passe (ITEM-045), via `authClient.changePassword` (Better Auth).
 * Rendu sans wrapper `Card` : composé par le parent dans la section
 * « Utilisateur » de `/profile` (ITEM-083).
 */
export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setSuccess(false)

    const errors: FieldErrors = {}
    if (!currentPassword) errors.currentPassword = "Le mot de passe actuel est requis."
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      errors.newPassword = `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`
    }
    if (confirmPassword !== newPassword) {
      errors.confirmPassword = "Les mots de passe ne correspondent pas."
    }
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setIsSubmitting(true)
    const { error } = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: false })
    setIsSubmitting(false)

    if (error) {
      setFormError((error.code && ERROR_MESSAGES[error.code]) || error.message || "Une erreur est survenue.")
      return
    }

    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
    setSuccess(true)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <p className="font-medium text-foreground">Mot de passe</p>

      <div className="flex flex-col gap-2">
        <Label htmlFor="current-password">Mot de passe actuel</Label>
        <Input
          id="current-password"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          aria-invalid={!!fieldErrors.currentPassword}
          disabled={isSubmitting}
        />
        {fieldErrors.currentPassword && <p className="text-sm text-destructive">{fieldErrors.currentPassword}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="new-password">Nouveau mot de passe</Label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          aria-invalid={!!fieldErrors.newPassword}
          disabled={isSubmitting}
        />
        {fieldErrors.newPassword && <p className="text-sm text-destructive">{fieldErrors.newPassword}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="confirm-password">Confirmer le nouveau mot de passe</Label>
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          aria-invalid={!!fieldErrors.confirmPassword}
          disabled={isSubmitting}
        />
        {fieldErrors.confirmPassword && <p className="text-sm text-destructive">{fieldErrors.confirmPassword}</p>}
      </div>

      {formError && (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      )}
      {success && <p className="text-sm text-muted-foreground">Mot de passe mis à jour.</p>}

      <Button type="submit" disabled={isSubmitting} className="w-fit">
        {isSubmitting ? "Mise à jour..." : "Mettre à jour le mot de passe"}
      </Button>
    </form>
  )
}
