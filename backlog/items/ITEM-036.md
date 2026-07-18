---
id: ITEM-036
title: Notifications push (Firebase Cloud Messaging)
status: implemented
priority: P2
type: feature
estimate: M
depends_on: [ITEM-035]
created: 2026-07-16
updated: 2026-07-16
---

## Idée / contexte
Le centre in-app (ITEM-035) ne notifie que si l'utilisateur a l'application ouverte. Le
push permet d'atteindre l'utilisateur même hors de l'app, conformément à la stack
Firebase prévue pour ce SaaS Core.

## User story
En tant qu'utilisateur, je veux recevoir une notification push sur mon
navigateur/appareil pour les événements importants, afin d'être alerté même quand
l'application n'est pas ouverte.

## Critères d'acceptation
- [x] Intégration Firebase Cloud Messaging côté client (demande de permission,
      enregistrement du token) et côté serveur (envoi via Firebase Admin SDK).
- [x] Les tokens d'appareil sont stockés par utilisateur et invalidés proprement en cas
      d'échec d'envoi.
- [x] Un événement de notification (ITEM-035) déclenche l'envoi push en plus de l'entrée
      in-app, selon les préférences utilisateur (ITEM-038). *(ITEM-038 n'existe pas
      encore : le déclenchement fonctionne, mais sans filtrage par préférences — voir
      note ci-dessous.)*

## Notes techniques
Nécessite un projet Firebase configuré (clé serveur + config client) — variables
d'environnement dédiées.
Fichiers : `lib/firebase.ts`, `lib/push-notifications.ts`.

Décisions à l'implémentation :
- **Préférences utilisateur (ITEM-038) non gérées** : ce modèle/cette UI n'existe pas
  encore dans le repo (ITEM-038 est toujours `todo`). `lib/notifications.ts#notify()`
  déclenche systématiquement `sendPushToUser()` pour chaque notification créée, sans
  filtrage. Le point d'insertion pour ITEM-038 est ce même `notify()` — ajouter une
  vérification des préférences avant l'appel à `sendPushToUser`.
- Modèle Prisma `PushToken` (id, userId, token unique, createdAt, updatedAt) — un token
  par appareil/navigateur, `onDelete: Cascade`. `token` est unique tous utilisateurs
  confondus (upsert par token dans `registerPushToken`) car FCM peut réémettre le même
  token pour un navigateur reconnecté sous un autre compte.
- `lib/firebase.ts` (Firebase Admin, lazy init) et `lib/firebase-client.ts` (SDK web,
  `"use client"`) suivent le même pattern « lazy client + fallback dev » que
  `lib/email.ts`/`lib/storage.ts` : si `FIREBASE_PROJECT_ID`/`FIREBASE_CLIENT_EMAIL`/
  `FIREBASE_PRIVATE_KEY` sont vides, `sendPushToUser` logue en console au lieu
  d'envoyer ; côté client, `isFirebaseConfigured()` masque l'affordance « Activer les
  notifications push » tant que les `NEXT_PUBLIC_FIREBASE_*` ne sont pas renseignées.
- `lib/push-notifications.ts#sendPushToUser` supprime les `PushToken` dont l'envoi
  échoue avec un code FCM définitif (`registration-token-not-registered`,
  `invalid-registration-token`, `invalid-argument`).
- Service worker FCM servi par une route dynamique `app/firebase-messaging-sw.js/route.ts`
  (et non un fichier statique dans `public/`) pour y injecter la config
  `NEXT_PUBLIC_FIREBASE_*` sans la dupliquer en dur — doit rester accessible à la racine.
- `NotificationPanel` (ITEM-035) affiche un bandeau « Activer les notifications push »
  quand Firebase est configuré et que la permission navigateur n'est ni accordée ni
  refusée (`usePushNotifications`) ; réactivation silencieuse au montage si la
  permission est déjà accordée (rafraîchit le token sans re-prompt).
- Variables d'environnement ajoutées à `.env`/`.env.example` : `FIREBASE_PROJECT_ID`,
  `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (serveur) et
  `NEXT_PUBLIC_FIREBASE_{API_KEY,AUTH_DOMAIN,PROJECT_ID,STORAGE_BUCKET,
  MESSAGING_SENDER_ID,APP_ID,VAPID_KEY}` (client) — toutes vides par défaut, aucun
  projet Firebase réel disponible dans cet environnement.

## Captures attendues
Prompt d'autorisation navigateur accepté, notification push reçue avec l'onglet fermé.
Nécessite un vrai projet Firebase configuré (variables d'environnement ci-dessus) pour
être capturé — non testable en l'état dans cet environnement de développement.

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-16 (implement) — démarrage
- 2026-07-16 (implement) — implémenté : modèle `PushToken` + migration, `lib/firebase.ts`
  (Admin SDK, lazy) + `lib/firebase-client.ts` (SDK web), `lib/push-notifications.ts`
  (envoi + invalidation des tokens morts), routes `app/api/push-tokens/route.ts`
  (POST/DELETE) et `app/firebase-messaging-sw.js/route.ts` (service worker dynamique),
  hook `usePushNotifications`, bandeau d'activation dans `NotificationPanel`, et
  branchement dans `lib/notifications.ts#notify()`. Filtrage par préférences (ITEM-038)
  non implémenté — n'existe pas encore. Fichiers : `prisma/schema.prisma`,
  `prisma/migrations/20260716140000_add_push_token/`, `lib/firebase.ts`,
  `lib/firebase-client.ts`, `lib/push-notifications.ts`, `lib/notifications.ts`,
  `app/api/push-tokens/route.ts`, `app/firebase-messaging-sw.js/route.ts`,
  `hooks/use-push-notifications.ts`, `components/notifications/NotificationPanel.tsx`,
  `.env`, `.env.example`. `tsc --noEmit`, `eslint` et `next build` passent ; migration
  appliquée sur la base locale ; route `/firebase-messaging-sw.js` vérifiée en dev
  (200, `application/javascript`).
