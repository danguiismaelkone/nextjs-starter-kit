---
id: ITEM-038
title: Préférences de notifications utilisateur
status: implemented
priority: P2
type: feature
estimate: S
depends_on: [ITEM-035]
created: 2026-07-16
updated: 2026-07-16
---

## Idée / contexte
Multiplier les canaux de notification (email, push, in-app) sans contrôle utilisateur
mène à de la sur-sollicitation et du désabonnement.

## User story
En tant qu'utilisateur, je veux choisir quels types de notifications je reçois et par
quel canal, afin de ne pas être submergé de sollicitations.

## Critères d'acceptation
- [x] Section « Notifications » dans `/settings` avec switches par canal (email, push,
      in-app) et par catégorie d'événement.
- [x] Les préférences sont respectées par `notify()` (ITEM-037) avant tout envoi.
- [x] Des notifications critiques (ex. sécurité) restent non désactivables.

## Notes techniques
Composant `NotificationSection.tsx` du module `user-settings`.
Fichiers : `app/(protected)/settings/*`, `components/settings/NotificationSection.tsx`.

Décisions à l'implémentation :
- **Route `/settings` créée par cet item** (elle n'existait pas encore — ITEM-045,
  page profil, est toujours `todo`). Seule la section Notifications y figure pour
  l'instant ; `/settings` accueillera d'autres sections au fil des items suivants
  (profil ITEM-045, sécurité ITEM-046). Le lien « Paramètres » du menu utilisateur
  (`components/layout/NavUser.tsx`) pointait déjà vers `/settings` avant cet item.
- Granularité choisie : **catégorie** (pas type brut) × canal, pour rester lisible en
  UI avec un nombre de types de notifications appelé à grandir (ITEM-037 n'en définit
  que 2 aujourd'hui). Le registre `lib/notification-templates.ts` (ITEM-037) porte
  désormais aussi cette metadata : `NOTIFICATION_CATEGORIES` (label, description,
  canaux pertinents, `critical`) et chaque entrée de `notificationTemplates` référence
  sa catégorie (`{ category, build }` au lieu d'une simple fonction). Ajouter un type
  reste donc un seul fichier à toucher, catégorie incluse.
- Modèle Prisma `NotificationPreference` (userId, category, channel, enabled) —
  **opt-out** : l'absence de ligne = canal activé par défaut. `lib/notification-
  preferences.ts` expose `getNotificationPreferences` (lecture résolue avec défauts),
  `setNotificationPreference` (no-op silencieux si la catégorie est `critical`, défense
  en profondeur en plus du switch désactivé côté UI) et `isChannelEnabled` (utilisé par
  `notify()`).
- `lib/notify.ts` vérifie `isChannelEnabled(userId, category, channel)` avant chacun
  des trois canaux (in-app, push, e-mail) — une catégorie `critical` court-circuite
  toujours à `true` dans `isChannelEnabled`, donc `password_reset_requested` reste
  injoignable à désactiver même si une ligne `NotificationPreference` existait.
- `NotificationSection` (client, `components/settings/NotificationSection.tsx`) : mise
  à jour optimiste locale + `updateNotificationPreferenceAction` (server action,
  `app/(protected)/settings/actions.ts`) dans un `startTransition`, avec rollback si
  l'action échoue. Switches des catégories `critical` rendus `disabled`.
- Composant shadcn `Switch` ajouté au projet (`components/ui/switch.tsx`, via
  `pnpm dlx shadcn add switch`) — n'existait pas encore dans `components/ui/`.
- Vérifié en dev (script direct sur la DB locale, hors HTTP) :
  `setNotificationPreference(userId, "organization", "push", false)` désactive bien
  `isChannelEnabled(userId, "organization", "push")` ; une tentative de désactiver
  `account_security/email` (catégorie critique) est silencieusement ignorée et
  `isChannelEnabled` reste `true`. `GET /settings` sans session redirige (307) vers
  `/login`, confirmant la garde d'accès de la page.

## Captures attendues
Section préférences avec switches, désactivation d'un canal empêchant effectivement
l'envoi correspondant. Le switch d'une catégorie critique (Sécurité du compte) doit
apparaître grisé/non cliquable avec le badge « Toujours actif ».

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-16 (implement) — démarrage
- 2026-07-16 (implement) — implémenté : modèle `NotificationPreference` + migration,
  `lib/notification-preferences.ts` (get/set/isChannelEnabled), extension de
  `lib/notification-templates.ts` avec `NOTIFICATION_CATEGORIES` (label, canaux,
  `critical`) et catégorie par type, branchement dans `lib/notify.ts` (vérifie
  `isChannelEnabled` avant chaque canal), page `/settings` (nouvelle route) +
  `NotificationSection.tsx` (switches optimistes) + `updateNotificationPreferenceAction`,
  composant shadcn `Switch` ajouté. Fichiers : `prisma/schema.prisma`,
  `prisma/migrations/20260716150000_add_notification_preference/`,
  `lib/notification-templates.ts`, `lib/notification-preferences.ts`, `lib/notify.ts`,
  `app/(protected)/settings/page.tsx`, `app/(protected)/settings/actions.ts`,
  `components/settings/NotificationSection.tsx`, `components/ui/switch.tsx`. `tsc
  --noEmit`, `eslint` et `next build` passent ; migration appliquée ; comportement
  vérifié en dev via script direct (préférence respectée, catégorie critique
  indésactivable) et `GET /settings` (redirection non-authentifiée).
