"use client"

import { useState } from "react"
import { Bell } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useNotifications } from "@/hooks/use-notifications"
import { NotificationPanel } from "./NotificationPanel"

/** Cloche de notifications (ITEM-035) : badge du nombre de non lues, ouvre le panneau au clic. */
export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const { notifications, unreadCount, loading, error, markAsRead, markAllAsRead } = useNotifications()

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={unreadCount > 0 ? `Notifications (${unreadCount} non lues)` : "Notifications"}
        className="relative group-data-[collapsible=icon]:hidden"
        onClick={() => setOpen(true)}
      >
        <Bell />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-4 min-w-4 justify-center rounded-full px-1 text-[10px]"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
      </Button>

      <NotificationPanel
        open={open}
        onOpenChange={setOpen}
        notifications={notifications}
        loading={loading}
        error={error}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
      />
    </>
  )
}
