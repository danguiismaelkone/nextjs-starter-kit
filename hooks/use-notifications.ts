"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export interface NotificationEntry {
  id: string
  type: string
  title: string
  body: string | null
  readAt: string | null
  createdAt: string
}

const POLL_INTERVAL_MS = 30_000

/**
 * Fil de notifications de l'utilisateur courant (ITEM-035). Pas d'infrastructure
 * temps réel (Socket.IO) dans ce repo : un polling léger toutes les 30s tient
 * lieu de compromis, à remplacer si un canal temps réel est ajouté plus tard.
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationEntry[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetchedOnce = useRef(false)

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications")
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? "Impossible de charger les notifications.")
        return
      }
      setNotifications(data.notifications ?? [])
      setUnreadCount(data.unreadCount ?? 0)
      setError(null)
    } catch {
      setError("Impossible de charger les notifications.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!fetchedOnce.current) {
      fetchedOnce.current = true
      refresh()
    }
    const interval = setInterval(refresh, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [refresh])

  const markAsRead = useCallback(async (id: string) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id && !notification.readAt
          ? { ...notification, readAt: new Date().toISOString() }
          : notification
      )
    )
    setUnreadCount((current) => Math.max(0, current - 1))

    const response = await fetch(`/api/notifications/${id}/read`, { method: "PATCH" })
    if (!response.ok) await refresh()
  }, [refresh])

  const markAllAsRead = useCallback(async () => {
    const now = new Date().toISOString()
    setNotifications((current) => current.map((notification) => ({ ...notification, readAt: notification.readAt ?? now })))
    setUnreadCount(0)

    const response = await fetch("/api/notifications/read-all", { method: "PATCH" })
    if (!response.ok) await refresh()
  }, [refresh])

  return { notifications, unreadCount, loading, error, refresh, markAsRead, markAllAsRead }
}
