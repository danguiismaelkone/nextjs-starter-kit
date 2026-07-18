"use client"

import { useActionState, useState } from "react"
import { Plus } from "lucide-react"
import { createRoleAction, type ActionState } from "./actions"
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

const initialState: ActionState = {}

export function CreateRoleDialog() {
  const [open, setOpen] = useState(false)
  const [state, formAction, isPending] = useActionState(createRoleAction, initialState)

  const [lastHandledState, setLastHandledState] = useState(state)
  if (state !== lastHandledState) {
    setLastHandledState(state)
    if (state.success) setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus /> Créer un rôle
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer un rôle personnalisé</DialogTitle>
          <DialogDescription>
            Choisissez ses permissions ensuite depuis la page du rôle.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="role-name">Nom du rôle</Label>
            <Input id="role-name" name="name" aria-invalid={!!state.fieldErrors?.name} />
            {state.fieldErrors?.name && <p className="text-sm text-destructive">{state.fieldErrors.name}</p>}
          </div>

          {state.formError && (
            <p role="alert" className="text-sm text-destructive">
              {state.formError}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
