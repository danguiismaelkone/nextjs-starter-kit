"use client"

import { BellRing, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import type { NotificationEntry } from "@/hooks/use-notifications"
import { usePushNotifications } from "@/hooks/use-push-notifications"

interface NotificationPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  notifications: NotificationEntry[]
  loading: boolean
  error: string | null
  onMarkAsRead: (id: string) => void
  onMarkAllAsRead: () => void
}

/** Panneau de notifications (slide-over, ITEM-035) : lecture au clic, tout marquer comme lu. */
export function NotificationPanel({
  open,
  onOpenChange,
  notifications,
  loading,
  error,
  onMarkAsRead,
  onMarkAllAsRead,
}: NotificationPanelProps) {
  const hasUnread = notifications.some((notification) => !notification.readAt)
  const push = usePushNotifications()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col">
        <SheetHeader className="flex-row items-center justify-between pr-10">
          <SheetTitle>Notifications</SheetTitle>
          <Button variant="ghost" size="sm" disabled={!hasUnread} onClick={onMarkAllAsRead}>
            Tout marquer comme lu
          </Button>
        </SheetHeader>

        {push.supported && (push.status === "idle" || push.status === "requesting") && (
          <div className="mx-4 flex items-center justify-between gap-2 rounded-md border bg-muted/40 p-3 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <BellRing className="h-4 w-4 shrink-0" />
              Recevez ces notifications même hors de l&apos;application.
            </span>
            <Button size="sm" disabled={push.status === "requesting"} onClick={push.enable}>
              {push.status === "requesting" ? "..." : "Activer"}
            </Button>
          </div>
        )}
        {push.supported && push.status === "denied" && (
          <p className="mx-4 rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
            Notifications push refusées — modifiez les permissions de votre navigateur pour ce site pour les
            réactiver.
          </p>
        )}

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          {loading && notifications.length === 0 && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && notifications.length === 0 && !error && (
            <p className="py-10 text-center text-sm text-muted-foreground">Aucune notification.</p>
          )}

          {notifications.length > 0 && (
            <ul className="space-y-2">
              {notifications.map((notification) => {
                const isUnread = !notification.readAt
                return (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => isUnread && onMarkAsRead(notification.id)}
                      className={cn(
                        "w-full rounded-md border p-3 text-left text-sm transition-colors hover:bg-muted",
                        isUnread ? "border-border bg-muted/40" : "border-transparent"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {isUnread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-hidden />}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-foreground">{notification.title}</p>
                          {notification.body && (
                            <p className="mt-0.5 line-clamp-2 text-muted-foreground">{notification.body}</p>
                          )}
                          <p className="mt-1 text-xs text-muted-foreground">
                            {new Date(notification.createdAt).toLocaleString("fr-FR")}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
