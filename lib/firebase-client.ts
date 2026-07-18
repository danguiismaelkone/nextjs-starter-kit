"use client"

import { getApps, initializeApp, type FirebaseOptions } from "firebase/app"

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

/** `false` tant que les `NEXT_PUBLIC_FIREBASE_*` ne sont pas renseignées (mode dev). */
export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId)
}

function getFirebaseApp() {
  return getApps()[0] ?? initializeApp(firebaseConfig)
}

/**
 * Demande la permission de notification du navigateur, enregistre le service
 * worker FCM (`app/firebase-messaging-sw.js/route.ts`) et retourne le token
 * d'appareil (ITEM-036). `null` si non supporté, non configuré ou refusé —
 * jamais d'exception : c'est à l'appelant de décider comment refléter l'échec.
 */
export async function requestPushToken(): Promise<string | null> {
  if (typeof window === "undefined" || !("Notification" in window) || !isFirebaseConfigured()) {
    return null
  }

  const { getMessaging, getToken, isSupported } = await import("firebase/messaging")
  if (!(await isSupported())) return null

  const permission = await Notification.requestPermission()
  if (permission !== "granted") return null

  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js")
  const messaging = getMessaging(getFirebaseApp())
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY

  return getToken(messaging, { vapidKey, serviceWorkerRegistration: registration })
}
