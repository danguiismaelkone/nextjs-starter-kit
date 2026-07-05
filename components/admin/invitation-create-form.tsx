"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { createInvitation } from "@/app/admin/users/invitations/actions"
import type { Role } from "@/lib/authorization"
import { EMAIL_REGEX, ROLES } from "@/lib/user-validation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"

export function InvitationCreateForm() {
  const router = useRouter()
  const [email, setEmail] = React.useState("")
  const [role, setRole] = React.useState<Role>("user")
  const [error, setError] = React.useState<string | null>(null)
  const [message, setMessage] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setMessage(null)

    if (!EMAIL_REGEX.test(email.trim())) {
      setError("Format d'e-mail invalide.")
      return
    }

    setIsSubmitting(true)
    const result = await createInvitation({ email: email.trim(), role })
    setIsSubmitting(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    setEmail("")
    setRole("user")
    setMessage("Invitation envoyée.")
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {error ? (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
          {message}
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="invite-email">E-mail</Label>
        <Input
          id="invite-email"
          name="email"
          type="email"
          autoComplete="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!error}
          disabled={isSubmitting}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="invite-role">Rôle</Label>
        <Select
          id="invite-role"
          name="role"
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          disabled={isSubmitting}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Envoi…" : "Inviter"}
        </Button>
      </div>
    </form>
  )
}
