---
id: ITEM-016
title: Membres d'organisation — rôles et invitations scoped à l'org
status: implemented
priority: P0
type: feature
estimate: M
depends_on: [ITEM-013, ITEM-006, ITEM-008]
created: 2026-07-16
updated: 2026-07-16
---

## Idée / contexte
ITEM-006 (rôles) et ITEM-008 (invitations) existent déjà mais sont globaux à la
plateforme. Une fois le multi-tenant en place (ITEM-013), il faut les rescoper par
organisation.

## User story
En tant qu'admin d'organisation, je veux inviter et gérer les rôles des membres de MON
organisation uniquement, afin de ne pas avoir de visibilité sur les autres clients.

## Critères d'acceptation
- [x] Les invitations (`Invitation`) sont liées à une `organizationId` et l'acceptation
      rattache le nouvel utilisateur (ou membership) à cette organisation.
- [x] La page `/admin/users` existante (ITEM-007) filtre par organisation active.
- [x] Les rôles gérables sont scoped à l'organisation (un `admin` d'une org ne voit pas
      les membres d'une autre org).
- [x] Un membre peut être retiré d'une organisation sans supprimer son compte
      utilisateur global.

## Notes techniques
**Critère 1** était déjà couvert par des items précédents, vérifié ici sans nouveau
code : `Invitation.organizationId` (schéma + migration + backfill) vient d'ITEM-013 ;
`acceptInvitationAction` rattachant l'invité via `membership.upsert` à l'organisation
de l'invitation vient d'ITEM-014.

**`/admin/users`** (`page.tsx`) : `where` combine désormais un scope org obligatoire
(`memberships: { some: { organizationId, status: "active" } }`) et la recherche
existante (`OR` nom/email), au lieu de s'exclure mutuellement.

**Scoping en profondeur, pas seulement dans la liste** (`app/(protected)/admin/users/actions.ts`) :
- `createUserAction` crée désormais aussi une `Membership` (rôle `admin`/`member` selon
  le rôle choisi) dans l'organisation active de l'admin — sans ça, un compte créé ici
  n'apparaîtrait dans aucune liste scoped-org.
- `updateUserAction` / `setUserDisabledAction` vérifient via `isActiveMember()` que la
  cible est bien membre actif de l'organisation de l'admin avant toute mutation — pas
  seulement caché de la liste, mais réellement refusé même en devinant un id d'un
  utilisateur d'une autre organisation (défense en profondeur).
- Nouvelle action `removeMemberAction` (+ `RemoveMemberButton.tsx`, calqué sur
  `DisableUserButton.tsx`) : soft-delete de la `Membership` (`status: "removed"`), le
  `User` global n'est jamais touché (critère 4). Garde-fous : impossible de se retirer
  soi-même, impossible de retirer le dernier membre actif (éviterait une organisation
  orpheline).

**`/admin/invitations`** également scopé (dans le périmètre listé) : la liste filtre
par `organizationId`, `resendInvitationAction`/`revokeInvitationAction` vérifient
`invitation.organizationId === organization.id` avant d'agir, et la vérification
« invitation déjà en attente » dans `createInvitationAction` est maintenant scopée à
l'organisation (avant : une invitation pending dans une AUTRE organisation bloquait à
tort une nouvelle invitation, et révélait indirectement son existence).

`User.role` (global `user`/`admin`) n'est **pas** migré vers `Membership.role` par cet
item — resynchroniser les deux à chaque édition risquerait d'écraser un rôle `owner`
en `admin`/`member`. Ce travail reste celui d'ITEM-018 (RBAC complet).

Fichiers : `app/(protected)/admin/users/page.tsx`,
`app/(protected)/admin/users/actions.ts`,
`app/(protected)/admin/users/RemoveMemberButton.tsx` (nouveau),
`app/(protected)/admin/invitations/page.tsx`,
`app/(protected)/admin/invitations/actions.ts`. Aucune migration Prisma requise
(schéma déjà posé par ITEM-013).

## Captures attendues
Page utilisateurs filtrée par organisation active ; invitation envoyée puis acceptée
rattachant le membre à la bonne organisation ; retrait d'un membre via
`RemoveMemberButton` (dialog de confirmation) sans suppression de son compte.

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-16 (implement) — démarrage
- 2026-07-16 (implement) — implémenté : `/admin/users` et `/admin/invitations` scopés
  à l'organisation active (liste + actions mutantes, avec garde-fous côté serveur, pas
  seulement côté UI) ; `createUserAction` crée la `Membership` correspondante ; nouvelle
  action `removeMemberAction` (+ `RemoveMemberButton.tsx`) retire un membre sans
  toucher à son compte global, avec garde anti-dernier-membre et anti-auto-retrait.
  Critère 1 déjà couvert par ITEM-013/ITEM-014, vérifié sans changement. Fichiers :
  app/(protected)/admin/users/page.tsx, app/(protected)/admin/users/actions.ts,
  app/(protected)/admin/users/RemoveMemberButton.tsx,
  app/(protected)/admin/invitations/page.tsx,
  app/(protected)/admin/invitations/actions.ts. `tsc --noEmit`, `eslint .` et
  `next build` OK.
- 2026-07-16 (implement) — démarrage
