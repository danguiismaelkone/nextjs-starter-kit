"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { setUserDisabled, updateUser } from "@/app/admin/users/actions"
import type { Role } from "@/lib/authorization"
import {
  ROLES,
  validateUserInput,
  type UserFormErrors,
} from "@/lib/user-validation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"

type EditableUser = {
  id: string
  name: string
  email: string
  role: Role
  disabled: boolean
}

export function UserEditForm({
  user,
  isSelf,
}: {
  user: EditableUser
  /** True when editing one's own account — self-disable is then blocked. */
  isSelf: boolean
}) {
  const router = useRouter()
  const [name, setName] = React.useState(user.name)
  const [role, setRole] = React.useState<Role>(user.role)
  const [fieldErrors, setFieldErrors] = React.useState<UserFormErrors>({})
  const [formError, setFormError] = React.useState<string | null>(null)
  const [message, setMessage] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isToggling, setIsToggling] = React.useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setMessage(null)

    const errors = validateUserInput({ name, role })
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      return
    }

    setIsSubmitting(true)
    const result = await updateUser(user.id, { name, role })

    if (!result.ok) {
      setFormError(result.error)
      setFieldErrors(result.fieldErrors ?? {})
      setIsSubmitting(false)
      return
    }

    setIsSubmitting(false)
    setMessage("Modifications enregistrées.")
    router.refresh()
  }

  async function handleToggleDisabled() {
    const nextDisabled = !user.disabled
    const confirmed = window.confirm(
      nextDisabled
        ? `Désactiver le compte de ${user.email} ? Ses sessions seront révoquées.`
        : `Réactiver le compte de ${user.email} ?`,
    )
    if (!confirmed) {
      return
    }

    setFormError(null)
    setMessage(null)
    setIsToggling(true)
    const result = await setUserDisabled(user.id, nextDisabled)
    setIsToggling(false)

    if (!result.ok) {
      setFormError(result.error)
      return
    }

    router.refresh()
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {formError ? (
          <p
            role="alert"
            className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {formError}
          </p>
        ) : null}
        {message ? (
          <p className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
            {message}
          </p>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" value={user.email} disabled readOnly />
          <p className="text-xs text-muted-foreground">
            L&apos;e-mail ne peut pas être modifié ici.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Nom</Label>
          <Input
            id="name"
            name="name"
            type="text"
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
          <Label htmlFor="role">Rôle</Label>
          <Select
            id="role"
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            aria-invalid={!!fieldErrors.role}
            disabled={isSubmitting}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
          {fieldErrors.role ? (
            <p className="text-sm text-destructive">{fieldErrors.role}</p>
          ) : null}
        </div>

        <div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </form>

      <div className="flex flex-col gap-2 border-t pt-6">
        <p className="text-sm font-medium">
          {user.disabled ? "Compte désactivé" : "Compte actif"}
        </p>
        <p className="text-sm text-muted-foreground">
          {isSelf
            ? "Vous ne pouvez pas désactiver votre propre compte."
            : user.disabled
              ? "Réactivez le compte pour rendre l'accès à l'utilisateur."
              : "Désactiver révoque l'accès sans supprimer le compte (réversible)."}
        </p>
        <div>
          <Button
            type="button"
            variant={user.disabled ? "outline" : "destructive"}
            onClick={handleToggleDisabled}
            disabled={isSelf || isToggling}
          >
            {isToggling
              ? "Traitement…"
              : user.disabled
                ? "Réactiver le compte"
                : "Désactiver le compte"}
          </Button>
        </div>
      </div>
    </div>
  )
}
