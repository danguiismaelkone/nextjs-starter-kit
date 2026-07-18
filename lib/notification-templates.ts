import { passwordResetEmailContent, type EmailContent } from "@/lib/email"

export type NotificationChannel = "email" | "push" | "inApp"

export interface InAppContent {
  title: string
  body?: string
}

export interface NotificationChannels {
  inApp: InAppContent
  /** Omis = pas d'e-mail pour ce type (ex. évènements purement in-app). */
  email?: EmailContent
}

/**
 * Catégorie sous laquelle un type de notification est groupé pour les
 * préférences utilisateur (ITEM-038, `lib/notification-preferences.ts`).
 * `critical: true` = non désactivable (ex. sécurité) : tous les canaux listés
 * sont toujours utilisés quelles que soient les préférences enregistrées.
 */
export interface NotificationCategoryMeta {
  label: string
  description: string
  /** Canaux pertinents pour cette catégorie — seuls ceux-ci sont affichés/respectés. */
  channels: NotificationChannel[]
  critical?: boolean
}

export type NotificationCategory = "account_security" | "organization"

export const NOTIFICATION_CATEGORIES: Record<NotificationCategory, NotificationCategoryMeta> = {
  account_security: {
    label: "Sécurité du compte",
    description: "Réinitialisation de mot de passe et autres événements de sécurité.",
    channels: ["email", "push", "inApp"],
    critical: true,
  },
  organization: {
    label: "Organisation",
    description: "Invitations, adhésions et changements liés à votre organisation.",
    channels: ["push", "inApp"],
  },
}

export interface PasswordResetRequestedData {
  url: string
}

export interface InvitationAcceptedData {
  organizationName: string
}

/**
 * Un type de notification = une donnée de payload. Ajouter un type
 * n'implique de toucher que ce fichier (critère d'acceptation ITEM-037) :
 * une entrée ici + une entrée dans `notificationTemplates` ci-dessous, dans
 * une catégorie existante ou nouvelle de `NOTIFICATION_CATEGORIES`.
 */
export interface NotificationTemplateMap {
  password_reset_requested: PasswordResetRequestedData
  invitation_accepted: InvitationAcceptedData
}

export type NotificationType = keyof NotificationTemplateMap

interface NotificationTemplate<TData> {
  category: NotificationCategory
  build: (data: TData) => NotificationChannels
}

type Templates = {
  [K in NotificationType]: NotificationTemplate<NotificationTemplateMap[K]>
}

/**
 * Registre central du contenu des notifications (ITEM-037), par type
 * d'évènement. Le contenu e-mail réutilise les gabarits de `lib/email.ts`
 * (ITEM-005) plutôt que de les dupliquer.
 */
export const notificationTemplates: Templates = {
  password_reset_requested: {
    category: "account_security",
    build: ({ url }) => ({
      inApp: {
        title: "Réinitialisation de mot de passe demandée",
        body: "Un lien de réinitialisation vous a été envoyé par e-mail.",
      },
      email: passwordResetEmailContent(url),
    }),
  },

  invitation_accepted: {
    category: "organization",
    build: ({ organizationName }) => ({
      inApp: {
        title: "Bienvenue !",
        body: `Vous avez rejoint ${organizationName}.`,
      },
    }),
  },
}
