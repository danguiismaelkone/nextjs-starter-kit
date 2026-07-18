import { NextResponse } from "next/server"

const FIREBASE_SDK_VERSION = "12.16.0"

/**
 * Sert le service worker FCM (ITEM-036) sur une route dynamique plutôt qu'un
 * fichier statique dans `public/` : c'est le seul moyen d'y injecter la config
 * Firebase (`NEXT_PUBLIC_FIREBASE_*`) sans la dupliquer en dur. Doit rester
 * accessible à la racine (`/firebase-messaging-sw.js`) — c'est le scope par
 * défaut attendu par `getToken()`/`navigator.serviceWorker.register()`
 * (lib/firebase-client.ts).
 */
export async function GET() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  }

  const script = `
importScripts("https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-messaging-compat.js");

firebase.initializeApp(${JSON.stringify(config)});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || "Notification", { body });
});
`

  return new NextResponse(script, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  })
}
