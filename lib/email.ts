import { Resend } from "resend"
import { logger } from "@/lib/logger"

interface SendEmailInput {
  to: string
  subject: string
  html: string
  /**
   * Nom d'expéditeur affiché (White Label, ITEM-069,
   * `Organization.emailFromName`) — déjà validé à l'écriture
   * (`lib/validators/organization.ts`, pas de retour à la ligne ni `<`/`>`) :
   * l'adresse d'envoi elle-même reste toujours `EMAIL_FROM`, jamais fournie
   * par l'organisation (nécessiterait une vérification de domaine SPF/DKIM,
   * hors périmètre).
   */
  fromName?: string | null
}

interface SendEmailResult {
  success: boolean
  error?: string
}

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  return new Resend(apiKey)
}

export async function sendEmail({ to, subject, html, fromName }: SendEmailInput): Promise<SendEmailResult> {
  const resend = getResendClient()

  if (!resend) {
    // Fallback dev : pas de RESEND_API_KEY configurée, on logue au lieu d'échouer.
    console.log(`[email:dev] À: ${to} | Sujet: ${subject}\n${html}`)
    return { success: true }
  }

  const fromAddress = process.env.EMAIL_FROM ?? "onboarding@resend.dev"
  const from = fromName ? `${fromName} <${fromAddress}>` : fromAddress

  try {
    const { error } = await resend.emails.send({ from, to, subject, html })
    if (error) {
      // Jamais `html` en contexte : peut embarquer un token de réinitialisation/invitation (critère 3).
      logger.error("Échec de l'envoi d'un e-mail via Resend", error, { to, subject })
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (err) {
    logger.error("Erreur inattendue lors de l'envoi d'un e-mail", err, { to, subject })
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue" }
  }
}

export interface EmailContent {
  subject: string
  html: string
}

/**
 * Contenu pur (pas d'envoi) — réutilisé par `sendPasswordResetEmail` ci-dessous
 * et par le registre de templates centralisé (ITEM-037, lib/notification-templates.ts)
 * pour éviter de dupliquer ce gabarit entre les deux points d'entrée.
 */
export function passwordResetEmailContent(url: string): EmailContent {
  return {
    subject: "Réinitialisez votre mot de passe",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h1 style="font-size: 18px;">Réinitialisation de mot de passe</h1>
        <p>Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le lien ci-dessous pour en choisir un nouveau :</p>
        <p><a href="${url}" style="color: #2563eb;">Réinitialiser mon mot de passe</a></p>
        <p style="color: #6b7280; font-size: 13px;">Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail.</p>
      </div>
    `,
  }
}

export function sendPasswordResetEmail({ to, url }: { to: string; url: string }) {
  return sendEmail({ to, ...passwordResetEmailContent(url) })
}

export interface InvitationEmailData {
  url: string
  inviterName?: string
}

/** Contenu pur — voir `passwordResetEmailContent`. */
export function invitationEmailContent({ url, inviterName }: InvitationEmailData): EmailContent {
  const intro = inviterName
    ? `${inviterName} vous invite à rejoindre l'application.`
    : "Vous avez été invité(e) à rejoindre l'application."

  return {
    subject: "Vous avez été invité(e)",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h1 style="font-size: 18px;">Invitation</h1>
        <p>${intro}</p>
        <p><a href="${url}" style="color: #2563eb;">Accepter l'invitation</a></p>
      </div>
    `,
  }
}

export function sendInvitationEmail({
  to,
  url,
  inviterName,
  fromName,
}: { to: string; fromName?: string | null } & InvitationEmailData) {
  return sendEmail({ to, ...invitationEmailContent({ url, inviterName }), fromName })
}
