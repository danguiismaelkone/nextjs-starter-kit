import { prisma } from "@/lib/prisma"
import { getFirebaseMessaging } from "@/lib/firebase"

export interface SendPushInput {
  userId: string
  title: string
  body?: string
}

/** Codes d'erreur FCM signalant un token définitivement mort (appareil désinstallé/désabonné). */
const INVALID_TOKEN_ERROR_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
])

function isInvalidTokenError(reason: unknown): boolean {
  return typeof reason === "object" && reason !== null && "code" in reason && INVALID_TOKEN_ERROR_CODES.has((reason as { code: string }).code)
}

/**
 * Envoie une notification push à tous les appareils enregistrés d'un
 * utilisateur (ITEM-036), en plus de l'entrée in-app (ITEM-035, voir
 * `lib/notifications.ts#notify`). Les tokens dont l'envoi échoue pour une
 * raison définitive sont supprimés — c'est le seul moyen de détecter qu'un
 * appareil s'est désabonné côté FCM.
 */
export async function sendPushToUser({ userId, title, body }: SendPushInput): Promise<void> {
  const tokens = await prisma.pushToken.findMany({ where: { userId } })
  if (tokens.length === 0) return

  const messaging = getFirebaseMessaging()
  if (!messaging) {
    // Fallback dev : pas de FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY configurées.
    console.log(`[push:dev] À ${tokens.length} appareil(s) de ${userId} : ${title}${body ? ` — ${body}` : ""}`)
    return
  }

  const results = await Promise.allSettled(
    tokens.map((pushToken) => messaging.send({ token: pushToken.token, notification: { title, body } }))
  )

  const staleTokenIds = tokens
    .filter((_, index) => {
      const result = results[index]
      return result.status === "rejected" && isInvalidTokenError(result.reason)
    })
    .map((pushToken) => pushToken.id)

  if (staleTokenIds.length > 0) {
    await prisma.pushToken.deleteMany({ where: { id: { in: staleTokenIds } } })
  }
}

/** Enregistre (ou réassigne à `userId`) un token d'appareil. */
export async function registerPushToken(userId: string, token: string): Promise<void> {
  await prisma.pushToken.upsert({
    where: { token },
    create: { userId, token },
    update: { userId },
  })
}

/** Désenregistre un token d'appareil (désactivation explicite côté client). */
export async function unregisterPushToken(userId: string, token: string): Promise<void> {
  await prisma.pushToken.deleteMany({ where: { token, userId } })
}
