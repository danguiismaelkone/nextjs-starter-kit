"use client"

import * as React from "react"
import { Dialog } from "radix-ui"
import { Menu, X } from "lucide-react"

import { LogoutButton } from "@/components/auth/logout-button"
import { AdminNav } from "@/components/admin/admin-nav"
import { Button } from "@/components/ui/button"

/**
 * Top bar of the admin shell: mobile menu trigger (opens the nav drawer), the
 * current admin's identity, and logout. On desktop the drawer trigger is hidden
 * since the sidebar is always visible. ITEM-009.
 */
export function AdminTopbar({
  user,
}: {
  user: { name?: string | null; email: string }
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b bg-background px-4">
      <div className="flex items-center gap-2">
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Ouvrir le menu de navigation"
            >
              <Menu className="size-5" />
            </Button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 md:hidden" />
            <Dialog.Content
              aria-describedby={undefined}
              className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar text-sidebar-foreground shadow-lg outline-none md:hidden"
            >
              <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
                <Dialog.Title className="font-semibold">
                  Administration
                </Dialog.Title>
                <Dialog.Close asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Fermer le menu"
                  >
                    <X className="size-5" />
                  </Button>
                </Dialog.Close>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                <AdminNav onNavigate={() => setOpen(false)} />
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
        <span className="font-semibold md:hidden">Administration</span>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden text-sm text-muted-foreground sm:inline">
          {user.name || user.email}
        </span>
        <LogoutButton />
      </div>
    </header>
  )
}
