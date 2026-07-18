"use client"

import { useActionState, useState } from "react"
import { Pencil, Plus } from "lucide-react"
import { createUserAction, updateUserAction, type ActionState } from "./actions"
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

interface UserFormDialogProps {
  mode: "create" | "edit"
  user?: { id: string; name: string; email: string; role: string }
  /** Recharge la page courante du `DataTable` parent (ITEM-061) après une soumission réussie. */
  onMutated?: () => void
}

export function UserFormDialog({ mode, user, onMutated }: UserFormDialogProps) {
  const [open, setOpen] = useState(false)
  const action = mode === "create" ? createUserAction : updateUserAction
  const [state, formAction, isPending] = useActionState(action, initialState)

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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {mode === "create" ? (
          <Button size="sm">
            <Plus /> Nouvel utilisateur
          </Button>
        ) : (
          <Button variant="ghost" size="icon-sm" aria-label="Modifier">
            <Pencil />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Nouvel utilisateur" : "Modifier l'utilisateur"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Créez un compte avec un mot de passe initial."
              : "Modifiez le nom et le rôle de l'utilisateur."}
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          {mode === "edit" && user && <input type="hidden" name="id" value={user.id} />}

          <div className="flex flex-col gap-2">
            <Label htmlFor={`name-${mode}`}>Nom</Label>
            <Input
              id={`name-${mode}`}
              name="name"
              defaultValue={user?.name}
              aria-invalid={!!state.fieldErrors?.name}
            />
            {state.fieldErrors?.name && <p className="text-sm text-destructive">{state.fieldErrors.name}</p>}
          </div>

          {mode === "create" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" aria-invalid={!!state.fieldErrors?.email} />
              {state.fieldErrors?.email && <p className="text-sm text-destructive">{state.fieldErrors.email}</p>}
            </div>
          )}

          {mode === "edit" && user && (
            <div className="flex flex-col gap-2">
              <Label>E-mail</Label>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          )}

          {mode === "create" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Mot de passe initial</Label>
              <Input id="password" name="password" type="password" aria-invalid={!!state.fieldErrors?.password} />
              {state.fieldErrors?.password && (
                <p className="text-sm text-destructive">{state.fieldErrors.password}</p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor={`role-${mode}`}>Rôle</Label>
            <Select name="role" defaultValue={user?.role ?? "user"}>
              <SelectTrigger id={`role-${mode}`} className="w-full">
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
              {isPending ? "Enregistrement..." : mode === "create" ? "Créer" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
