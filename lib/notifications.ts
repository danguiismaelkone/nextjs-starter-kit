import { prisma } from "@/lib/prisma"

export interface CreateNotificationParams {
  userId: string
  type: string
  title: string
  body?: string
}

/**
 * Écrit une notification in-app pour un utilisateur (ITEM-035) — couche de
 * données pure, sans effet de bord push/e-mail. Le point d'entrée qui route
 * vers tous les canaux (in-app + push + e-mail) à partir d'un type d'événement
 * est `notify()` dans `lib/notify.ts` (ITEM-037).
 */
export async function createInAppNotification({ userId, type, title, body }: CreateNotificationParams) {
  return prisma.notification.create({
    data: { userId, type, title, body },
  })
}

/** Notifications les plus récentes d'un utilisateur, lues et non lues confondues. */
export async function listNotifications(userId: string, limit = 20) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  })
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } })
}

/** Marque une notification comme lue si elle appartient à `userId`. */
export async function markNotificationRead(userId: string, notificationId: string) {
  const { count } = await prisma.notification.updateMany({
    where: { id: notificationId, userId, readAt: null },
    data: { readAt: new Date() },
  })
  return count > 0
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  })
}
