---
id: ITEM-037
title: Templates de notifications centralisés (email + push)
status: implemented
priority: P1
type: feature
estimate: M
depends_on: [ITEM-005, ITEM-035]
created: 2026-07-16
updated: 2026-07-16
---

## Idée / contexte
Avec des e-mails (ITEM-005), des notifications in-app (ITEM-035) et bientôt du push
(ITEM-036), le contenu de chaque événement risque d'être dupliqué par canal. Un SaaS
Core réutilisable a besoin d'un point central.

## User story
En tant que développeur du SaaS Core, je veux un point central pour définir le contenu
des notifications, afin d'éviter la duplication et de garder une cohérence de ton entre
canaux.

## Critères d'acceptation
- [x] Un registre de templates (`lib/notification-templates.ts`) définit, par type
      d'événement, le contenu email (réutilise les templates Resend d'ITEM-005) et le
      contenu in-app/push.
- [x] Envoyer une notification passe par une fonction unique (`notify(userId, type,
      data)`) qui route vers les canaux activés.
- [x] Ajouter un nouveau type de notification ne nécessite de toucher qu'un seul
      fichier de configuration.

## Notes techniques
Fichiers : `lib/notification-templates.ts`, `lib/notify.ts`.

Décisions à l'implémentation :
- `lib/notification-templates.ts` définit `NotificationTemplateMap` (type d'évènement →
  forme du payload) et `notificationTemplates` (type → fonction `data => { inApp, email?
  }`). Ajouter un type = ajouter une interface de payload + une entrée dans ces deux
  structures, **dans ce seul fichier** — `notify()` reste inchangé (générique sur
  `NotificationTemplateMap`, l'autocomplétion/vérification de type du payload par
  `notify(userId, type, data)` en découle automatiquement).
- `lib/notify.ts#notify(userId, type, data)` est le point d'entrée unique : crée la
  ligne in-app (`lib/notifications.ts#createInAppNotification`, désormais une pure
  couche de données sans effet de bord), envoie le push (`lib/push-notifications.ts`,
  best-effort) puis l'e-mail si le template en définit un (résout l'adresse via
  `prisma.user`, best-effort). Un échec push/e-mail est journalisé mais ne fait jamais
  échouer `notify()` ni le canal in-app.
- `lib/email.ts` refactoré : le HTML/sujet de chaque e-mail est extrait en fonctions
  pures (`passwordResetEmailContent`, `invitationEmailContent`) ; `sendPasswordResetEmail`/
  `sendInvitationEmail` restent des wrappers fins autour d'elles pour les appelants qui
  n'ont pas de `userId` (ex. invitation — cible une adresse e-mail, pas encore un
  utilisateur). `notificationTemplates.password_reset_requested` réutilise
  `passwordResetEmailContent` telle quelle (pas de duplication).
- Deux émetteurs réels branchés (au lieu de rester une fondation isolée comme
  ITEM-035/036) :
  - `lib/auth.ts` (hook Better Auth `sendResetPassword`) appelle désormais
    `notify(user.id, "password_reset_requested", { url })` — e-mail + in-app + push.
  - `app/invite/accept/actions.ts` (`acceptInvitationAction`) appelle
    `notify(user.id, "invitation_accepted", { organizationName })` après la
    transaction d'adhésion — in-app + push uniquement (pas de canal e-mail pour ce
    type : l'utilisateur est déjà sur la page).
  - L'invitation elle-même (`app/(protected)/admin/invitations/actions.ts`) n'est
    **pas** routée via `notify()` : elle cible une adresse e-mail sans `userId`
    existant, hors du périmètre d'une fonction scopée par utilisateur.
- Vérifié en dev (serveur + DB locale) : `POST /api/auth/request-password-reset` a
  déclenché `notify()` → e-mail logué en console (fallback dev, `RESEND_API_KEY` vide)
  et ligne `Notification` créée en base avec le bon `userId`/`type`/`title`/`body`.

## Captures attendues
N/A (refactor interne). Vérifié fonctionnellement en dev via `POST
/api/auth/request-password-reset` : e-mail (fallback console) + notification in-app
cohérents pour le même évènement — voir note ci-dessus.

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-16 (implement) — démarrage
- 2026-07-16 (implement) — implémenté : registre `lib/notification-templates.ts` (2
  types : `password_reset_requested`, `invitation_accepted`), point d'entrée unique
  `lib/notify.ts#notify(userId, type, data)` routant in-app + push + e-mail,
  `lib/notifications.ts#notify` renommé `createInAppNotification` (pure couche de
  données), `lib/email.ts` refactoré en gabarits purs réutilisés par le registre, et
  deux émetteurs réels branchés (`lib/auth.ts` reset de mot de passe,
  `app/invite/accept/actions.ts` bienvenue après acceptation). Fichiers :
  `lib/notification-templates.ts`, `lib/notify.ts`, `lib/notifications.ts`,
  `lib/email.ts`, `lib/auth.ts`, `app/invite/accept/actions.ts`. `tsc --noEmit`,
  `eslint` et `next build` passent ; vérifié fonctionnellement en dev (voir Notes
  techniques).
