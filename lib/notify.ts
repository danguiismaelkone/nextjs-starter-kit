import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import { createInAppNotification } from "@/lib/notifications"
import { sendPushToUser } from "@/lib/push-notifications"
import { isChannelEnabled } from "@/lib/notification-preferences"
import { notificationTemplates, type NotificationTemplateMap, type NotificationType } from "@/lib/notification-templates"
import { logger } from "@/lib/logger"

/**
 * Point d'entrée unique pour émettre une notification (ITEM-037) : résout le
 * contenu par canal depuis `lib/notification-templates.ts`, vérifie les
 * préférences utilisateur par catégorie/canal (ITEM-038,
 * `lib/notification-preferences.ts` — toujours activées pour une catégorie
 * `critical`), puis route vers l'in-app (ITEM-035), le push (ITEM-036, si des
 * appareils sont enregistrés) et l'e-mail (ITEM-005, si le template en
 * définit un et que le canal est activé).
 *
 * Un échec d'envoi push ou e-mail n'empêche jamais la création de la
 * notification in-app ni les autres canaux (best-effort, erreurs journalisées).
 */
export async function notify<T extends NotificationType>(
  userId: string,
  type: T,
  data: NotificationTemplateMap[T]
) {
  const template = notificationTemplates[type]
  const { category } = template
  const channels = template.build(data)

  let notification = null
  if (await isChannelEnabled(userId, category, "inApp")) {
    notification = await createInAppNotification({
      userId,
      type,
      title: channels.inApp.title,
      body: channels.inApp.body,
    })
  }

  if (await isChannelEnabled(userId, category, "push")) {
    await sendPushToUser({ userId, title: channels.inApp.title, body: channels.inApp.body }).catch((err) => {
      logger.warn("Échec de l'envoi push d'une notification", { userId, notificationType: type, error: err })
    })
  }

  if (channels.email && (await isChannelEnabled(userId, category, "email"))) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
    if (user) {
      const { subject, html } = channels.email
      const result = await sendEmail({ to: user.email, subject, html })
      if (!result.success) {
        logger.warn("Échec de l'envoi e-mail d'une notification", { userId, notificationType: type, error: result.error })
      }
    }
  }

  return notification
}
