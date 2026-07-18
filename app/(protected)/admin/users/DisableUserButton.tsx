"use client"

import { useState, useTransition } from "react"
import { Ban, RotateCcw } from "lucide-react"
import { setUserDisabledAction } from "./actions"
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

interface DisableUserButtonProps {
  userId: string
  userName: string
  disabled: boolean
  isSelf: boolean
  /** Recharge la ligne dans le `DataTable` parent (ITEM-061) après une mutation réussie. */
  onMutated?: () => void
}

export function DisableUserButton({ userId, userName, disabled, isSelf, onMutated }: DisableUserButtonProps) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (isSelf) return null

  function handleConfirm() {
    startTransition(async () => {
      const result = await setUserDisabledAction(userId, !disabled)
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
        <Button variant="ghost" size="icon-sm" aria-label={disabled ? "Réactiver" : "Désactiver"}>
          {disabled ? <RotateCcw /> : <Ban />}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{disabled ? "Réactiver ce compte ?" : "Désactiver ce compte ?"}</AlertDialogTitle>
          <AlertDialogDescription>
            {disabled
              ? `${userName} pourra de nouveau se connecter.`
              : `${userName} sera déconnecté(e) et ne pourra plus se connecter, jusqu'à réactivation.`}
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
            variant={disabled ? "default" : "destructive"}
            disabled={isPending}
            onClick={(e) => {
              e.preventDefault()
              handleConfirm()
            }}
          >
            {isPending ? "..." : disabled ? "Réactiver" : "Désactiver"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
