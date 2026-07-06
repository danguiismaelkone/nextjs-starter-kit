"use client"

import * as React from "react"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { InvitationCreateForm } from "@/components/admin/invitation-create-form"

/**
 * "Inviter un utilisateur" action rendered in the invitations table toolbar
 * (ITEM-014): opens the invitation form in a modal instead of the inline card.
 * Mirrors {@link UserCreateDialog} for a consistent create/invite experience.
 */
export function InvitationCreateDialog() {
  const [open, setOpen] = React.useState(false)

  // The form triggers `router.refresh()` itself after `onSuccess`; here we just
  // close the modal so the new pending invitation appears in the table.
  function handleSuccess() {
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus />
          Inviter un utilisateur
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inviter un utilisateur</DialogTitle>
          <DialogDescription>
            L&apos;invité recevra un lien pour définir son mot de passe et
            rejoindre l&apos;application avec le rôle choisi.
          </DialogDescription>
        </DialogHeader>
        <InvitationCreateForm
          onSuccess={handleSuccess}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
