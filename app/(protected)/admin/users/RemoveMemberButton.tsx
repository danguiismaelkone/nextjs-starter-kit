"use client"

import { useState, useTransition } from "react"
import { UserMinus } from "lucide-react"
import { removeMemberAction } from "./actions"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface RemoveMemberButtonProps {
  userId: string
  userName: string
  isSelf: boolean
  /** Recharge la ligne dans le `DataTable` parent (ITEM-061) après une mutation réussie. */
  onMutated?: () => void
}

export function RemoveMemberButton({ userId, userName, isSelf, onMutated }: RemoveMemberButtonProps) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (isSelf) return null

  function handleConfirm() {
    startTransition(async () => {
      const result = await removeMemberAction(userId)
      if (result.formError) {
        setError(result.formError)
      } else {
        setOpen(false)
        onMutated?.()
      }
    })
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setError(null)
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Retirer de l'organisation">
          <UserMinus />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Retirer {userName} de l&apos;organisation ?</AlertDialogTitle>
          <AlertDialogDescription>
            {userName} n&apos;aura plus accès aux données de cette organisation, mais son compte reste
            actif et peut appartenir à d&apos;autres organisations.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            onClick={(e) => {
              e.preventDefault()
              handleConfirm()
            }}
          >
            {isPending ? "..." : "Retirer"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
