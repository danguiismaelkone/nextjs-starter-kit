"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
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
import { UserCreateForm } from "@/components/admin/user-create-form"

/**
 * "Nouvel utilisateur" action rendered in the users table toolbar (ITEM-013):
 * opens the creation form in a modal instead of navigating to `/admin/users/new`.
 * A `?new=1` query param (e.g. the dashboard shortcut) auto-opens the modal, and
 * is cleared on close so a refresh doesn't reopen it.
 */
export function UserCreateDialog() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    if (searchParams.get("new") === "1") setOpen(true)
  }, [searchParams])

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next && searchParams.get("new")) {
      const params = new URLSearchParams(searchParams)
      params.delete("new")
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    }
  }

  // The form triggers `router.refresh()` itself after `onSuccess`; here we just
  // close the modal (and clear the `?new` param).
  function handleSuccess() {
    handleOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus />
          Nouvel utilisateur
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvel utilisateur</DialogTitle>
          <DialogDescription>
            Créez un compte avec un mot de passe initial. L&apos;utilisateur
            pourra se connecter immédiatement.
          </DialogDescription>
        </DialogHeader>
        <UserCreateForm
          onSuccess={handleSuccess}
          onCancel={() => handleOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
