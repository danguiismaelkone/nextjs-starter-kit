import { cert, getApps, initializeApp, type App } from "firebase-admin/app"
import { getMessaging, type Messaging } from "firebase-admin/messaging"

let cachedApp: App | null | undefined

/**
 * App Firebase Admin paresseuse, construite au premier appel — même approche
 * que `getResendClient()` (lib/email.ts) et `getStorageClient()` (lib/storage.ts).
 * Retourne `null` si le compte de service n'est pas configuré (mode dev).
 */
function getFirebaseAdminApp(): App | null {
  if (cachedApp !== undefined) return cachedApp

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  // Le presse-papier/`.env` échappe les retours à la ligne de la clé PEM en `\n` littéral.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")

  if (!projectId || !clientEmail || !privateKey) {
    cachedApp = null
    return null
  }

  cachedApp = getApps()[0] ?? initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
  return cachedApp
}

/** `null` si Firebase Admin n'est pas configuré (voir `lib/push-notifications.ts` pour le fallback dev). */
export function getFirebaseMessaging(): Messaging | null {
  const app = getFirebaseAdminApp()
  return app ? getMessaging(app) : null
}
