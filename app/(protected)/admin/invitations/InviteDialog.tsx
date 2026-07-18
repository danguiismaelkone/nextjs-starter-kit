"use client"

import { useActionState, useState } from "react"
import { Mail } from "lucide-react"
import { createInvitationAction, type ActionState } from "./actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const initialState: ActionState = {}

interface InviteDialogProps {
  /** Recharge la page courante du `DataTable` parent (ITEM-080) après une invitation envoyée. */
  onMutated?: () => void
}

export function InviteDialog({ onMutated }: InviteDialogProps = {}) {
  const [open, setOpen] = useState(false)
  const [state, formAction, isPending] = useActionState(createInvitationAction, initialState)

  // Ferme le dialog dès qu'une soumission réussit (dérivé au rendu plutôt que via useEffect).
  const [lastHandledState, setLastHandledState] = useState(state)
  if (state !== lastHandledState) {
    setLastHandledState(state)
    if (state.success) {
      setOpen(false)
      onMutated?.()
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Mail /> Inviter
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inviter un utilisateur</DialogTitle>
          <DialogDescription>
            Un e-mail avec un lien sécurisé sera envoyé pour qu&apos;il crée son compte.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="invite-email">E-mail</Label>
            <Input id="invite-email" name="email" type="email" aria-invalid={!!state.fieldErrors?.email} />
            {state.fieldErrors?.email && <p className="text-sm text-destructive">{state.fieldErrors.email}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="invite-role">Rôle</Label>
            <Select name="role" defaultValue="user">
              <SelectTrigger id="invite-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Utilisateur</SelectItem>
                <SelectItem value="admin">Administrateur</SelectItem>
              </SelectContent>
            </Select>
            {state.fieldErrors?.role && <p className="text-sm text-destructive">{state.fieldErrors.role}</p>}
          </div>

          {state.formError && (
            <p role="alert" className="text-sm text-destructive">
              {state.formError}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Envoi..." : "Envoyer l'invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
