---
id: ITEM-035
title: Modèle Notification + centre de notifications in-app
status: implemented
priority: P1
type: feature
estimate: M
depends_on: [ITEM-013]
created: 2026-07-16
updated: 2026-07-16
---

## Idée / contexte
Au-delà des e-mails transactionnels (ITEM-005), les utilisateurs ont besoin d'un fil de
notifications persistant dans l'application pour ne rien manquer.

## User story
En tant qu'utilisateur, je veux voir mes notifications récentes dans un panneau dédié,
afin de rester informé des événements importants sans consulter mes e-mails.

## Critères d'acceptation
- [x] Modèle Prisma `Notification` (userId, type, title, body, readAt, createdAt).
- [x] `NotificationBell` dans le header affiche un badge du nombre de notifications non
      lues.
- [x] `NotificationPanel` (slide-over) liste les notifications, avec marquage lu au
      clic et « tout marquer comme lu ».

## Notes techniques
Module `notifications` fournit `NotificationBell.tsx`, `NotificationPanel.tsx`,
`useNotifications.ts` — la version FATIHOUNE utilise Socket.IO pour le temps réel ; à
défaut, un polling léger (30s) est un compromis acceptable pour cette passe.
Fichiers : `prisma/schema.prisma`, `components/notifications/*`,
`hooks/useNotifications.ts`.

Décisions à l'implémentation :
- `Notification` est **purement per-user** (pas d'`organizationId`), conforme aux
  critères d'acceptation : le fil de notifications survit à un changement
  d'organisation active. `readAt DateTime?` (nul = non lu), même convention que
  `Folder.deletedAt`. `type` est une `String` libre (pas d'enum Prisma), cohérent
  avec `Membership.role`/`Subscription.status` ailleurs dans le schéma.
- `lib/notifications.ts` centralise les accès Prisma (`notify`, `listNotifications`,
  `countUnreadNotifications`, `markNotificationRead`, `markAllNotificationsRead`) —
  `notify()` est le point d'entrée que réutiliseront les futurs émetteurs
  (ITEM-037 : templates centralisés email + push).
- Routes API : `GET /api/notifications` (liste + `unreadCount`),
  `PATCH /api/notifications/[id]/read`, `PATCH /api/notifications/read-all` —
  scoping par `session.user.id` uniquement, pas de `getCurrentOrganization()`.
- Fichier du hook nommé `hooks/use-notifications.ts` (kebab-case) plutôt que
  `useNotifications.ts` littéral, pour rester cohérent avec `hooks/use-upload.ts`
  déjà en place ; l'export reste `useNotifications`.
- `NotificationBell` est insérée dans `components/layout/AppSidebar.tsx` (pas de
  header dédié dans ce repo — shell `Sidebar` shadcn), à côté du bouton
  « Rechercher » dans `SidebarHeader`. Elle possède son propre état d'ouverture et
  monte `<NotificationPanel>` (shadcn `Sheet`, `side="right"`) — premier usage
  réel de `Sheet` en dehors de la sidebar mobile.
- Polling 30s via `setInterval` dans `useNotifications` (aucun mécanisme temps
  réel existant dans le repo) ; marquage lu optimiste côté client avec
  re-fetch de secours si la requête échoue.

## Captures attendues
Cloche avec badge non-lu, panel ouvert listant des notifications, marquage lu au clic.

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-16 (implement) — démarrage
- 2026-07-16 (implement) — implémenté : modèle `Notification` + migration, `lib/notifications.ts`,
  routes `app/api/notifications/*`, hook `useNotifications` (polling 30s), `NotificationBell`
  (badge non-lu dans `AppSidebar`) et `NotificationPanel` (slide-over `Sheet`, marquage lu au
  clic + tout marquer comme lu). Fichiers : `prisma/schema.prisma`,
  `prisma/migrations/20260716130000_add_notification/`, `lib/notifications.ts`,
  `app/api/notifications/route.ts`, `app/api/notifications/[id]/read/route.ts`,
  `app/api/notifications/read-all/route.ts`, `hooks/use-notifications.ts`,
  `components/notifications/NotificationBell.tsx`, `components/notifications/NotificationPanel.tsx`,
  `components/layout/AppSidebar.tsx`. `tsc --noEmit`, `eslint` et `next build` passent ; migration
  appliquée sur la base locale (`prisma migrate deploy`).
