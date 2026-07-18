"use client"

import { useCallback, useEffect, useState } from "react"
import { isFirebaseConfigured, requestPushToken } from "@/lib/firebase-client"

export type PushPermissionStatus = "idle" | "requesting" | "enabled" | "denied" | "unsupported" | "error"

/**
 * Active les notifications push pour l'appareil courant (ITEM-036) : demande
 * de permission navigateur, récupération du token FCM et enregistrement côté
 * serveur (`POST /api/push-tokens`). Si la permission est déjà accordée (visite
 * précédente), le token est rafraîchi silencieusement au montage — `getToken()`
 * ne re-déclenche pas le prompt navigateur dans ce cas.
 */
export function usePushNotifications() {
  const [status, setStatus] = useState<PushPermissionStatus>("idle")
  const configured = isFirebaseConfigured()

  const enable = useCallback(async () => {
    if (!configured) {
      setStatus("unsupported")
      return
    }

    setStatus("requesting")
    try {
      const token = await requestPushToken()
      if (!token) {
        setStatus(typeof Notification !== "undefined" && Notification.permission === "denied" ? "denied" : "unsupported")
        return
      }

      const response = await fetch("/api/push-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })
      setStatus(response.ok ? "enabled" : "error")
    } catch {
      setStatus("error")
    }
  }, [configured])

  useEffect(() => {
    if (configured && typeof Notification !== "undefined" && Notification.permission === "granted") {
      enable()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `enable` ne doit s'exécuter qu'au montage/changement de `configured`, pas à chaque re-render
  }, [configured])

  return { status, enable, supported: configured }
}
