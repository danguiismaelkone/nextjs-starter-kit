import { prisma } from "@/lib/prisma"
import { NOTIFICATION_CATEGORIES, type NotificationCategory, type NotificationChannel } from "@/lib/notification-templates"

export interface ChannelPreference {
  channel: NotificationChannel
  enabled: boolean
}

export interface CategoryPreference {
  category: NotificationCategory
  label: string
  description: string
  critical: boolean
  channels: ChannelPreference[]
}

/**
 * Préférences résolues pour un utilisateur (ITEM-038) : une entrée par
 * catégorie de `NOTIFICATION_CATEGORIES`, un canal activé par défaut en
 * l'absence de ligne enregistrée (opt-out). Les catégories `critical` sont
 * toujours retournées comme activées, indépendamment des lignes en base.
 */
export async function getNotificationPreferences(userId: string): Promise<CategoryPreference[]> {
  const rows = await prisma.notificationPreference.findMany({ where: { userId } })
  const stored = new Map(rows.map((row) => [`${row.category}:${row.channel}`, row.enabled]))

  return (Object.entries(NOTIFICATION_CATEGORIES) as [NotificationCategory, (typeof NOTIFICATION_CATEGORIES)[NotificationCategory]][]).map(
    ([category, meta]) => ({
      category,
      label: meta.label,
      description: meta.description,
      critical: !!meta.critical,
      channels: meta.channels.map((channel) => ({
        channel,
        enabled: meta.critical ? true : (stored.get(`${category}:${channel}`) ?? true),
      })),
    })
  )
}

/** Bascule un canal pour une catégorie — ignoré pour les catégories critiques (non désactivables). */
export async function setNotificationPreference(
  userId: string,
  category: NotificationCategory,
  channel: NotificationChannel,
  enabled: boolean
): Promise<void> {
  const meta = NOTIFICATION_CATEGORIES[category]
  if (!meta || meta.critical || !meta.channels.includes(channel)) return

  await prisma.notificationPreference.upsert({
    where: { userId_category_channel: { userId, category, channel } },
    create: { userId, category, channel, enabled },
    update: { enabled },
  })
}

/**
 * Utilisé par `notify()` (ITEM-037, `lib/notify.ts`) avant tout envoi sur un
 * canal donné. Les catégories critiques court-circuitent toujours à `true`.
 */
export async function isChannelEnabled(
  userId: string,
  category: NotificationCategory,
  channel: NotificationChannel
): Promise<boolean> {
  const meta = NOTIFICATION_CATEGORIES[category]
  if (!meta || meta.critical) return true
  if (!meta.channels.includes(channel)) return false

  const pref = await prisma.notificationPreference.findUnique({
    where: { userId_category_channel: { userId, category, channel } },
  })
  return pref?.enabled ?? true
}
