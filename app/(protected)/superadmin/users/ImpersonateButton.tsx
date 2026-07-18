"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { UserCog } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { startImpersonationAction } from "../actions"
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

interface ImpersonateButtonProps {
  userId: string
  userName: string
}

/**
 * Bascule la session du super-admin vers celle de `userId` (ITEM-050) :
 * `startImpersonationAction` valide et journalise l'action pendant que la
 * session en cours est encore celle du super-admin, puis
 * `authClient.admin.impersonateUser` (côté client, seul endroit où le cookie
 * de session du navigateur peut être remplacé) effectue le bascule réel.
 */
export function ImpersonateButton({ userId, userName }: ImpersonateButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      const result = await startImpersonationAction(userId)
      if (result.error) {
        setError(result.error)
        return
      }

      const { error: impersonateError } = await authClient.admin.impersonateUser({ userId })
      if (impersonateError) {
        setError(impersonateError.message ?? "Une erreur est survenue.")
        return
      }

      setOpen(false)
      router.push("/dashboard")
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
        <Button variant="ghost" size="icon-sm" aria-label={`Se connecter en tant que ${userName}`}>
          <UserCog />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Se connecter en tant que {userName} ?</AlertDialogTitle>
          <AlertDialogDescription>
            Vous serez connecté(e) au compte de {userName} pour déboguer, avec une bannière permettant de revenir à
            votre compte à tout moment. Cette action est journalisée.
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
            disabled={isPending}
            onClick={(e) => {
              e.preventDefault()
              handleConfirm()
            }}
          >
            {isPending ? "..." : "Se connecter en tant que cet utilisateur"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
