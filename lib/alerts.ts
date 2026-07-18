import { sendEmail } from "@/lib/email"
import { logger } from "@/lib/logger"

export interface AlertInput {
  subject: string
  message: string
}

/**
 * Envoie une alerte ops (ITEM-063) par e-mail (`OPS_ALERT_EMAIL`) et/ou Slack
 * (`SLACK_ALERT_WEBHOOK_URL`), chacun optionnel/indépendant — même patron
 * "dégrade proprement sans configuration" que le reste des intégrations
 * externes de ce repo. Toujours journalisée (`logger.error`, ITEM-062) même
 * si aucun canal n'est configuré : l'alerte reste visible dans les logs/le
 * service de tracking, pas seulement dans une boîte mail que personne ne
 * regarde.
 */
export async function sendAlert({ subject, message }: AlertInput): Promise<void> {
  logger.error(subject, undefined, { alert: true, message })

  const tasks: Promise<void>[] = []

  const opsEmail = process.env.OPS_ALERT_EMAIL
  if (opsEmail) {
    tasks.push(
      sendEmail({ to: opsEmail, subject: `[Alerte] ${subject}`, html: `<p>${message}</p>` }).then((result) => {
        if (!result.success) {
          logger.warn("Échec de l'envoi d'une alerte par e-mail", { to: opsEmail, error: result.error })
        }
      })
    )
  }

  const slackWebhookUrl = process.env.SLACK_ALERT_WEBHOOK_URL
  if (slackWebhookUrl) {
    tasks.push(
      fetch(slackWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: `*${subject}*\n${message}` }),
      })
        .then((response) => {
          if (!response.ok) {
            logger.warn("Échec de l'envoi d'une alerte Slack", { status: response.status })
          }
        })
        .catch((err) => {
          logger.warn("Échec de l'envoi d'une alerte Slack", { error: err })
        })
    )
  }

  await Promise.allSettled(tasks)
}
