"use client"

import { useState, useTransition } from "react"
import { Ban, RotateCcw } from "lucide-react"
import { setUserSuspendedAction } from "../actions"
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

interface SuspendUserButtonProps {
  userId: string
  userName: string
  suspended: boolean
}

export function SuspendUserButton({ userId, userName, suspended }: SuspendUserButtonProps) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      const result = await setUserSuspendedAction(userId, !suspended)
      if (result.error) {
        setError(result.error)
      } else {
        setOpen(false)
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
        <Button variant="ghost" size="icon-sm" aria-label={suspended ? "Réactiver" : "Suspendre"}>
          {suspended ? <RotateCcw /> : <Ban />}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{suspended ? "Réactiver ce compte ?" : "Suspendre ce compte ?"}</AlertDialogTitle>
          <AlertDialogDescription>
            {suspended
              ? `${userName} pourra de nouveau se connecter.`
              : `${userName} sera déconnecté(e) de toutes ses sessions et ne pourra plus se connecter, jusqu'à réactivation.`}
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
            variant={suspended ? "default" : "destructive"}
            disabled={isPending}
            onClick={(e) => {
              e.preventDefault()
              handleConfirm()
            }}
          >
            {isPending ? "..." : suspended ? "Réactiver" : "Suspendre"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
