"use server"

import { getSession } from "@/lib/auth"
import { setNotificationPreference } from "@/lib/notification-preferences"
import type { NotificationCategory, NotificationChannel } from "@/lib/notification-templates"
import { notificationPreferenceSchema } from "@/lib/validators/organization"

export interface UpdatePreferenceResult {
  error?: string
}

/** Bascule un canal de notification pour l'utilisateur connecté (ITEM-038). */
export async function updateNotificationPreferenceAction(
  category: NotificationCategory,
  channel: NotificationChannel,
  enabled: boolean
): Promise<UpdatePreferenceResult> {
  const session = await getSession()
  if (!session?.user) return { error: "Session introuvable." }

  const parsed = notificationPreferenceSchema.safeParse({ category, channel, enabled })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Requête invalide." }
  }

  await setNotificationPreference(session.user.id, parsed.data.category as NotificationCategory, parsed.data.channel, enabled)
  return {}
}
