---
id: ITEM-019
title: Matrice de permissions + guards d'accès (UI admin)
status: implemented
priority: P1
type: feature
estimate: M
depends_on: [ITEM-018]
created: 2026-07-16
updated: 2026-07-16
---

## Idée / contexte
ITEM-018 pose le modèle RBAC en base. Il faut une UI pour que les admins d'organisation
puissent voir et éditer les permissions sans intervention technique.

## User story
En tant qu'admin d'organisation, je veux voir et éditer visuellement quelles
permissions sont accordées à chaque rôle, afin de comprendre et ajuster les accès sans
erreur.

## Critères d'acceptation
- [x] Page `/roles` liste les rôles de l'organisation active.
- [x] Page `/roles/[id]` affiche une matrice resource × action éditable
      (`PermissionMatrix.tsx`).
- [x] Les modifications sont immédiatement appliquées (pas de cache stale) et
      journalisées dans l'audit log (ITEM-051).

## Notes techniques
**Critère 3 (audit log)** : ITEM-051 (`AuditLog` — page, filtres, export) n'est pas
encore implémenté, mais le critère l'exige explicitement pour CET item. Plutôt que
d'ignorer le critère ou de construire tout ITEM-051 par anticipation, une fondation
minimale a été ajoutée : modèle Prisma `AuditLog` (organizationId, actorId, action,
targetType, targetId, metadata, createdAt — même schéma que celui déjà prévu dans
ITEM-051) + `lib/audit.ts` (`logAudit()`, écriture seule, append-only). Chaque
bascule de permission écrit une entrée (`role.permission.granted`/`revoked`).
Aucune page de consultation n'est créée ici — c'est le périmètre propre d'ITEM-051,
qui pourra lire cette même table sans migration supplémentaire. Vérifié par un
script jetable : octroi d'une permission au rôle "member" → `RolePermission` +
`AuditLog` créés avec les bonnes données → révocation → nettoyage complet (aucune
donnée de test laissée en base).

**Pages `/roles` et `/roles/[id]`** (chemins littéraux du critère, pas
`/admin/roles` malgré la convention `/admin/*` des items précédents) : gardées par
`requireAdmin()` (ITEM-018, RBAC réel) comme `/admin/users`/`/admin/invitations`.
`[id]` vérifie que le rôle appartient bien à l'organisation active
(`notFound()` sinon), même schéma de garde qu'ITEM-017. Composants suivant la
convention déjà établie dans le repo plutôt que celle suggérée par le module
FATIHOUNE : tables de listing (`/roles`) inline dans la page serveur (comme
`admin/users/page.tsx`/`admin/invitations/page.tsx`), seul le widget vraiment
interactif (`PermissionMatrix`, cases à cocher) est un composant client dédié — pas
de `RoleTable.tsx`/`RoleForm.tsx` séparés, non nécessaires ici.

**Matrice** : construite dynamiquement à partir de `Permission.resource`/`action`
existants (actuellement un seul couple `admin:access`, donc une grille 1×1) —
prévue pour grossir automatiquement à mesure que d'autres items ajoutent des
permissions, sans changement de code.

**Application immédiate** (critère 3) : chaque case à cocher déclenche directement
`toggleRolePermissionAction` (mise à jour optimiste côté client + écriture
serveur + `revalidatePath`), pas de bouton « Enregistrer » séparé ni de brouillon.

**Nouveau composant UI** `components/ui/checkbox.tsx` : primitive shadcn/ui
standard absente du projet, ajoutée en suivant le style d'import déjà utilisé
(`radix-ui` consolidé, cf. `dropdown-menu.tsx`) plutôt que `@radix-ui/react-checkbox`.

Comme pour ITEM-017, aucun lien de navigation vers `/roles` n'a été ajouté dans
`AppSidebar` — hors périmètre des critères, accessible via URL directe.

Fichiers : `prisma/schema.prisma`, migration
`prisma/migrations/20260716075728_add_audit_log/migration.sql`, `lib/audit.ts`
(nouveau, hors liste initiale), `components/ui/checkbox.tsx` (nouveau, hors liste
initiale), `app/(protected)/roles/page.tsx`, `app/(protected)/roles/[id]/page.tsx`,
`app/(protected)/roles/[id]/actions.ts`, `components/roles/PermissionMatrix.tsx`.

## Captures attendues
Liste des rôles (owner/admin/member) de l'organisation ; matrice de permissions
ouverte pour un rôle avec la case `admin:access` visible ; case cochée/décochée et
persistée après rechargement de page.

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-16 (implement) — démarrage
- 2026-07-16 (implement) — implémenté : pages `/roles` (liste) et `/roles/[id]`
  (matrice `PermissionMatrix`, mise à jour optimiste + persistance immédiate via
  `toggleRolePermissionAction`) ; fondation minimale `AuditLog` (schéma + `lib/audit.ts`)
  pour satisfaire le critère de journalisation en l'absence d'ITEM-051 ; nouveau
  composant `components/ui/checkbox.tsx`. Fichiers : prisma/schema.prisma,
  prisma/migrations/20260716075728_add_audit_log/migration.sql, lib/audit.ts,
  components/ui/checkbox.tsx, app/(protected)/roles/page.tsx,
  app/(protected)/roles/[id]/page.tsx, app/(protected)/roles/[id]/actions.ts,
  components/roles/PermissionMatrix.tsx. `tsc --noEmit`, `eslint .` et `next build`
  OK (nouvelles routes `/roles` et `/roles/[id]` confirmées dans la sortie de
  build). Octroi/révocation + écriture d'audit vérifiés directement en base via un
  script jetable, données de test nettoyées.
