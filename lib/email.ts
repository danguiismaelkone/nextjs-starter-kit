import { Resend } from "resend"

/**
 * Transactional e-mail service (Resend).
 *
 * Exposes a generic `sendEmail()` plus dedicated helpers built on top of it
 * (`sendPasswordResetEmail`, `sendInvitationEmail`).
 *
 * Dev fallback: when `RESEND_API_KEY` is missing, e-mails are logged to the
 * console instead of being sent, so local flows (password reset, invitations)
 * keep working without a Resend account. Any send failure is caught and logged
 * without throwing, so a failed e-mail never crashes the calling flow.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY
const EMAIL_FROM = process.env.EMAIL_FROM ?? "onboarding@resend.dev"

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null

export type SendEmailParams = {
  to: string
  subject: string
  html: string
  /** Optional plain-text fallback. */
  text?: string
}

export type SendEmailResult =
  | { ok: true; id: string | null }
  | { ok: false; error: string }

/**
 * Send an e-mail through Resend. Never throws: returns a result object and
 * logs failures. In dev (no API key) the message is logged and reported as sent.
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
}: SendEmailParams): Promise<SendEmailResult> {
  // Dev fallback — no API key configured.
  if (!resend) {
    console.info(
      `[email:dev] RESEND_API_KEY absent — e-mail non envoyé.\n` +
        `  to:      ${to}\n` +
        `  from:    ${EMAIL_FROM}\n` +
        `  subject: ${subject}\n` +
        `  text:    ${text ?? "(voir HTML)"}`
    )
    return { ok: true, id: null }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject,
      html,
      ...(text ? { text } : {}),
    })

    if (error) {
      console.error(`[email] Échec d'envoi à ${to} (${subject}):`, error)
      return { ok: false, error: error.message }
    }

    return { ok: true, id: data?.id ?? null }
  } catch (err) {
    // Network / unexpected errors — capture and log, never rethrow.
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[email] Exception d'envoi à ${to} (${subject}):`, err)
    return { ok: false, error: message }
  }
}

/** Minimal shared HTML shell for transactional e-mails. */
function layout(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:24px;background:#f4f4f5;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#18181b;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
      <tr><td>
        <h1 style="margin:0 0 16px;font-size:20px;">${title}</h1>
        ${bodyHtml}
      </td></tr>
    </table>
  </body>
</html>`
}

/** Accessible button-style link used across templates. */
function button(url: string, label: string): string {
  return `<a href="${url}" style="display:inline-block;padding:10px 18px;background:#18181b;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:500;">${label}</a>`
}

export type PasswordResetEmailParams = {
  to: string
  /** Tokenized reset URL. */
  url: string
  /** Optional recipient name for a friendlier greeting. */
  userName?: string
}

/** Template: password reset request. */
export function sendPasswordResetEmail({
  to,
  url,
  userName,
}: PasswordResetEmailParams): Promise<SendEmailResult> {
  const greeting = userName ? `Bonjour ${userName},` : "Bonjour,"
  const subject = "Réinitialisation de votre mot de passe"
  const html = layout(
    subject,
    `<p style="margin:0 0 16px;">${greeting}</p>
     <p style="margin:0 0 16px;">Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau. Ce lien expirera prochainement.</p>
     <p style="margin:0 0 24px;">${button(url, "Réinitialiser mon mot de passe")}</p>
     <p style="margin:0 0 8px;color:#71717a;font-size:13px;">Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.</p>
     <p style="margin:0;color:#71717a;font-size:13px;word-break:break-all;">Lien : ${url}</p>`
  )
  const text = `${greeting}\n\nRéinitialisez votre mot de passe via ce lien : ${url}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.`

  return sendEmail({ to, subject, html, text })
}

export type InvitationEmailParams = {
  to: string
  /** Tokenized invitation acceptance URL. */
  url: string
  /** Name of the person who sent the invitation. */
  inviterName?: string
}

/** Template: user invitation. */
export function sendInvitationEmail({
  to,
  url,
  inviterName,
}: InvitationEmailParams): Promise<SendEmailResult> {
  const from = inviterName ? `${inviterName} vous` : "Vous"
  const subject = "Vous êtes invité à rejoindre l'application"
  const html = layout(
    subject,
    `<p style="margin:0 0 16px;">Bonjour,</p>
     <p style="margin:0 0 16px;">${from} a invité à créer un compte. Cliquez sur le bouton ci-dessous pour accepter l'invitation et définir votre mot de passe.</p>
     <p style="margin:0 0 24px;">${button(url, "Accepter l'invitation")}</p>
     <p style="margin:0;color:#71717a;font-size:13px;word-break:break-all;">Lien : ${url}</p>`
  )
  const text = `Bonjour,\n\n${from} a invité à rejoindre l'application. Acceptez l'invitation via ce lien : ${url}`

  return sendEmail({ to, subject, html, text })
}
