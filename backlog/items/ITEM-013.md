---
id: ITEM-013
title: Modèle de données Organization + Membership (multi-tenant)
status: verified
priority: P0
type: feature
estimate: L
depends_on: [ITEM-001]
created: 2026-07-16
updated: 2026-07-16
---

## Idée / contexte
Le starter est aujourd'hui mono-tenant (un `User` global avec un rôle `user`/`admin`, pas
de notion d'organisation). Le SaaS Core vise à devenir un socle réutilisable pour de
futurs SaaS B2B, ce qui suppose d'isoler les données par organisation cliente dès la
fondation, avant d'y brancher facturation, documents, etc.

## User story
En tant que propriétaire de la plateforme, je veux que chaque compte appartienne à une
ou plusieurs organisations, afin de pouvoir facturer et isoler les données par client.

## Critères d'acceptation
- [x] Modèles Prisma `Organization` (id, name, slug, logo, createdAt) et `Membership`
      (userId, organizationId, role, status) ajoutés, migration appliquée sans perte de
      données existantes.
- [x] Chaque `User` existant est rattaché à une organisation par défaut créée
      automatiquement lors de la migration (pas de compte orphelin).
- [x] Un helper `getCurrentOrganization()` / `requireOrganization()` expose
      l'organisation active de la session côté serveur.
- [x] Les tables `Invitation`, et futures tables scoped-org, référencent
      `organizationId`.

## Notes techniques
Implémenté à la main plutôt que via `/module:add multi-tenant` : le module FATIHOUNE
scaffoldait des pages/actions qui auraient dupliqué/écrasé l'auth Better Auth déjà en
place (ITEM-001) ; seul le pattern de données (Organization/Membership) a été repris.
`User.role` (string `user`/`admin`) est **conservé tel quel** pour l'instant — il n'est
pas encore consommé par `Membership.role` (`owner`/`admin`/`member`) ; sa dépréciation
au profit du RBAC par organisation est le travail d'ITEM-016 (invitations/rôles scoped)
et ITEM-018 (RBAC complet), pas de cet item.

Migration `20260716070703_add_organization_multi_tenant` : ajout des tables
`organization`/`membership`, colonne `invitation.organizationId` ajoutée nullable puis
backfillée (création d'une « Organisation par défaut », rattachement de chaque
utilisateur existant via `Membership` — le plus ancien devient `owner`, les autres
`admin` si `User.role = admin` sinon `member` — et des invitations existantes) avant
d'être rendue `NOT NULL`. Vérifié sur la base de dev (1 utilisateur, 0 invitation) :
organisation par défaut créée, utilisateur rattaché en `owner`.

`lib/organization.ts` : `getCurrentOrganization()`/`requireOrganization()` retiennent la
plus ancienne adhésion active de l'utilisateur (pas encore de sélecteur — ITEM-015).
`requireOrganization()` redirige vers `/login` si non connecté, vers `/dashboard` si
connecté sans organisation (cas d'un utilisateur inscrit avant l'onboarding
multi-tenant d'ITEM-014, non géré plus finement ici — hors périmètre de cet item).

`app/(protected)/admin/invitations/actions.ts` : `sendInvitation()`/
`createInvitationAction()` mis à jour pour fournir l'`organizationId` désormais requis
par le schéma (via `requireOrganization()`). Le filtrage des invitations/membres par
organisation active (au-delà de la simple contrainte de schéma) reste le périmètre
d'ITEM-016.

Fichiers : `prisma/schema.prisma`, migration
`prisma/migrations/20260716070703_add_organization_multi_tenant/migration.sql`,
`lib/organization.ts`, `app/(protected)/admin/invitations/actions.ts`.

## Captures attendues
N/A (fondation backend, pas d'UI dédiée — voir ITEM-014/ITEM-015).

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-16 (implement) — démarrage
- 2026-07-16 (implement) — implémenté : modèles Prisma `Organization`/`Membership`,
  migration avec backfill (org par défaut + rattachement des utilisateurs/invitations
  existants), helpers `getCurrentOrganization()`/`requireOrganization()`. Fichiers :
  prisma/schema.prisma, prisma/migrations/20260716070703_add_organization_multi_tenant/migration.sql,
  lib/organization.ts, app/(protected)/admin/invitations/actions.ts. `tsc --noEmit`,
  `eslint` et `next build` OK ; backfill vérifié sur la base de dev.
- 2026-07-16 (verify) — vérifié : les 4 critères sont satisfaits (revue de
  `prisma/schema.prisma`, de la migration `20260716070703_add_organization_multi_tenant`,
  de `lib/organization.ts` et de `app/(protected)/admin/invitations/actions.ts`).
  `tsc --noEmit`, `eslint .` et `next build` OK (re-exécutés indépendamment) ;
  0 utilisateur orphelin confirmé en base (1 user → 1 membership `owner`). Note non
  bloquante : `resendInvitationAction`/`revokeInvitationAction` ne vérifient pas encore
  que l'invitation appartient à l'organisation active de l'admin — hors périmètre de cet
  item, explicitement couvert par ITEM-016.
