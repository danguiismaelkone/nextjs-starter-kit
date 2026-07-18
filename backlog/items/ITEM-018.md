---
id: ITEM-018
title: Modèle Role/Permission dynamique (RBAC avancé)
status: implemented
priority: P1
type: feature
estimate: L
depends_on: [ITEM-013]
created: 2026-07-16
updated: 2026-07-16
---

## Idée / contexte
Le contrôle d'accès actuel (ITEM-006) est un simple champ `role` string avec un seul
guard `requireAdmin()`. Pour un SaaS Core réutilisable, il faut un vrai RBAC
configurable : rôles custom par organisation, permissions granulaires (resource ×
action).

## User story
En tant qu'admin d'organisation, je veux définir des rôles avec des permissions
précises, afin d'adapter les accès aux besoins de mon équipe.

## Critères d'acceptation
- [x] Modèles Prisma `Role` et `Permission` (resource, action) + table de jonction,
      scoped par organisation.
- [x] Rôles système par défaut (owner, admin, member) créés automatiquement à la
      création d'une organisation, non supprimables.
- [x] Helper `hasPermission(userId, orgId, resource, action)` remplace/complète
      `requireAdmin()` existant.
- [x] Les guards existants (`lib/authorization.ts`) sont migrés vers ce système sans
      régression sur les pages admin actuelles.

## Notes techniques
**Bug réel découvert et corrigé, pas seulement une évolution d'architecture** :
avant cet item, `requireAdmin()` vérifiait `session.user.role === "admin"` (champ
global `User.role`). Or depuis l'onboarding par organisation (ITEM-014), un
utilisateur qui s'inscrit devient `owner` de sa propre organisation
(`Membership.role = "owner"`) mais garde `User.role = "user"` par défaut — ce champ
global n'est **jamais** mis à jour par le flux d'inscription. Résultat vérifié en
base sur l'utilisateur de dev réel : `User.role = "user"`, `Membership.role =
"owner"`, donc **`/admin/users` et `/admin/invitations` étaient inaccessibles à
l'admin/owner de sa propre organisation** avant ce correctif. `requireAdmin()`
utilise maintenant `hasPermission(userId, orgId, "admin", "access")`, revérifié en
base après implémentation : ce même utilisateur obtient bien `hasAdminAccess: true`.

Modèle : `Role` (scoped par organisation, `key` = "owner"/"admin"/"member" = même
valeur que `Membership.role`), `Permission` (resource, action — partagée entre
organisations), `RolePermission` (jonction). `hasPermission()` résout le rôle de
l'utilisateur dans l'org via `Membership.role`, retrouve le `Role` système
correspondant dans cette organisation, et vérifie la permission demandée.

**Non-supprimable (critère 2)** : marqué via `Role.isSystem = true` à la création.
Il n'existe pour l'instant **aucune UI/API de suppression de rôle** (ce sera
ITEM-019) — le flag pose la base pour qu'ITEM-019 refuse la suppression d'un rôle
système, mais n'est pas encore activement testé contre une tentative de suppression
puisqu'aucun chemin ne permet de supprimer un rôle à ce stade.

**Seed automatique à la création d'organisation** : `seedSystemRoles()`
(`lib/permissions.ts`) est appelée depuis `createOrganizationWithOwner()`
(`lib/organization.ts`, ITEM-014) — sans ça, une organisation créée après cette
migration n'aurait aucun `Role`, et `hasPermission()` refuserait même son propre
owner. Vérifié avec un script jetable : création d'une organisation de test →
`seedSystemRoles()` → rôles + permissions correctement seedés → nettoyage.

**Permissions seedées** : seulement `admin:access` pour l'instant (owner + admin),
car c'est la seule permission réellement consommée aujourd'hui (`requireAdmin()`).
Une taxonomie plus riche (permissions granulaires par ressource) est le travail
d'ITEM-019 (UI de matrice de permissions) — pas inventé ici sans consommateur réel.

**Déviation par rapport aux « Fichiers » listés** : pour rester cohérent avec le
correctif ci-dessus, `app/(protected)/layout.tsx` et `components/layout/AppSidebar.tsx`
ont aussi été touchés — la visibilité du lien "Administration" dans la sidebar
utilisait le même champ `User.role` obsolète (prop `role`) ; sans ce changement, un
owner nouvellement inscrit aurait pu ouvrir `/admin/users` via URL directe (grâce au
correctif de `requireAdmin()`) mais n'aurait jamais vu le lien pour y accéder — un
résultat à moitié corrigé et confus. La prop `role?: string` devient
`canAccessAdmin?: boolean`, calculée via la même permission que `requireAdmin()`.

`User.role` (global) et les vérifications directes de `Membership.role` déjà en
place dans ITEM-016/ITEM-017 (ex. `membership.role !== "owner" && ... !== "admin"`)
ne sont **pas** migrées vers `hasPermission()` par cet item — hors périmètre des
critères listés (qui ne citent que `lib/authorization.ts`), et risque de régression
inutile sur des items déjà vérifiés sans bénéfice fonctionnel nouveau.

Fichiers : `prisma/schema.prisma`, migration
`prisma/migrations/20260716074455_add_role_permission_rbac/migration.sql`,
`lib/permissions.ts` (nouveau), `lib/authorization.ts`, `lib/organization.ts` (hors
liste initiale), `app/(protected)/layout.tsx` (hors liste initiale),
`components/layout/AppSidebar.tsx` (hors liste initiale).

## Captures attendues
N/A (fondation backend — voir ITEM-019 pour l'UI).

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-16 (implement) — démarrage
- 2026-07-16 (implement) — implémenté : modèles `Role`/`Permission`/`RolePermission`
  + migration avec backfill (rôles système et permission `admin:access` pour les
  organisations existantes) ; `lib/permissions.ts` (`seedSystemRoles`,
  `hasPermission`) ; `requireAdmin()` migré vers le RBAC par organisation — corrige
  un bug réel où les owners d'organisation (via l'inscription, ITEM-014) n'avaient
  jamais accès à `/admin/*` faute de `User.role` mis à jour ; `createOrganizationWithOwner`
  seed désormais les rôles à la création ; sidebar (`layout.tsx`/`AppSidebar.tsx`)
  alignée sur la même permission pour la visibilité du lien Administration. Fichiers :
  prisma/schema.prisma, prisma/migrations/20260716074455_add_role_permission_rbac/migration.sql,
  lib/permissions.ts, lib/authorization.ts, lib/organization.ts,
  app/(protected)/layout.tsx, components/layout/AppSidebar.tsx. `tsc --noEmit`,
  `eslint .` et `next build` OK. Vérifié empiriquement en base : l'utilisateur de dev
  réel (User.role="user", Membership.role="owner") obtient bien `hasAdminAccess:
  true` après le correctif (false avant) ; seeding testé sur une organisation neuve
  jetable puis nettoyée.
