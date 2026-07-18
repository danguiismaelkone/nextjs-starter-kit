"use client"

import { useState, useTransition } from "react"
import { Ban, Send } from "lucide-react"
import { resendInvitationAction, revokeInvitationAction } from "./actions"
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

export function InvitationRowActions({ id, email }: { id: string; email: string }) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isResending, startResend] = useTransition()
  const [isRevoking, startRevoke] = useTransition()

  function handleResend() {
    startResend(async () => {
      const result = await resendInvitationAction(id)
      if (result.formError) setError(result.formError)
    })
  }

  function handleRevoke() {
    startRevoke(async () => {
      const result = await revokeInvitationAction(id)
      if (result.formError) {
        setError(result.formError)
      } else {
        setOpen(false)
      }
    })
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button variant="ghost" size="icon-sm" aria-label="Renvoyer" disabled={isResending} onClick={handleResend}>
        <Send />
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Révoquer">
            <Ban />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Révoquer cette invitation ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le lien envoyé à {email} ne fonctionnera plus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isRevoking}
              onClick={(e) => {
                e.preventDefault()
                handleRevoke()
              }}
            >
              {isRevoking ? "..." : "Révoquer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
