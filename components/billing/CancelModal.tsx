"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
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

export function CancelModal() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      const response = await fetch("/api/billing/cancel", { method: "POST" })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? "Impossible de résilier l'abonnement.")
        return
      }
      setOpen(false)
      router.refresh()
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
        <Button variant="outline" size="sm">
          Annuler l&apos;abonnement
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Annuler l&apos;abonnement ?</AlertDialogTitle>
          <AlertDialogDescription>
            Vous conserverez l&apos;accès jusqu&apos;à la fin de la période déjà payée, sans remboursement
            au prorata. Aucune donnée n&apos;est supprimée.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Conserver</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            onClick={(e) => {
              e.preventDefault()
              handleConfirm()
            }}
          >
            {isPending ? "..." : "Confirmer l'annulation"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
