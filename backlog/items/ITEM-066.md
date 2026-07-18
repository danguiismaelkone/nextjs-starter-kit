---
id: ITEM-066
title: RBAC granulaire par organisation (Enterprise)
status: implemented
priority: P3
type: feature
estimate: M
depends_on: [ITEM-018, ITEM-016]
created: 2026-07-16
updated: 2026-07-17
---

## Idée / contexte
Le RBAC de base (ITEM-018/ITEM-019) couvre les rôles système standard. Les grandes
organisations ont souvent une structure interne plus complexe nécessitant des rôles
entièrement personnalisés.

## User story
En tant qu'admin d'une organisation Enterprise, je veux créer des rôles totalement
personnalisés au-delà des rôles système, afin de refléter la structure précise de mon
équipe.

## Critères d'acceptation
- [x] Une organisation Enterprise peut créer des rôles custom avec un sous-ensemble
      arbitraire de permissions (au-delà de owner/admin/member).
- [x] Cette fonctionnalité est réservée aux organisations sur un plan Enterprise
      (vérifiée via ITEM-020).

## Notes techniques
Extension d'ITEM-018/ITEM-019 : la matrice de permissions (`PermissionMatrix`,
`/roles/[id]`) permettait déjà de cocher un sous-ensemble arbitraire de permissions
pour n'importe quel `Role` (y compris non-système) — il manquait uniquement un moyen
de **créer** un `Role` non-système, gardé par le plan Enterprise.

Décisions :
- `lib/billing.ts` : nouvelle `isEnterpriseOrganization(organizationId)` — vérifie que
  `Subscription.plan.name === "Enterprise"` (pas le statut `active`/`trialing`, laissé
  à `hasActiveEntitlement` pour la fraîcheur de période). Constante
  `ENTERPRISE_PLAN_NAME` exportée pour éviter un littéral dupliqué.
- Un plan `"Enterprise"` a été ajouté à `prisma/seed.ts` (`DEFAULT_PLANS`) : sans lui,
  aucune organisation ne pouvait jamais satisfaire la garde (aucun plan Enterprise
  n'existait en base). Suit le même schéma que Starter/Pro
  (`SEED_ENTERPRISE_STRIPE_PRICE_ID` optionnel).
- `app/(protected)/roles/actions.ts` (nouveau) : `createRoleAction` — vérifie
  `admin:access` (`requireAdmin`) puis `isEnterpriseOrganization` côté serveur (pas
  seulement caché dans l'UI, même principe que le reste du repo), crée le `Role`
  (`isSystem: false`, sans permission), journalise `role.created` (`AuditLog`). La
  `key` du rôle est dérivée du nom via `slugify` (désormais exporté depuis
  `lib/organization.ts`) avec désambiguïsation par suffixe numérique, comme
  `createOrganizationWithOwner`.
- Le rôle créé démarre **sans** permission — l'admin les accorde ensuite depuis
  `/roles/[id]` (`PermissionMatrix`, ITEM-019, inchangé) : c'est déjà l'écran qui
  couvre "sous-ensemble arbitraire de permissions", pas dupliqué dans le dialog de
  création.
- `app/(protected)/roles/page.tsx` : bouton "Créer un rôle" (`CreateRoleDialog`,
  nouveau) affiché seulement si `isEnterpriseOrganization`, sinon bouton désactivé +
  mention "Réservé au plan Enterprise" (même schéma d'upsell que le feature flag
  `advanced-analytics` du dashboard, ITEM-052).

Fichiers : `lib/billing.ts`, `lib/organization.ts` (export `slugify`),
`lib/validators/organization.ts` (`createRoleSchema`), `lib/audit-labels.ts`
(`role.created`), `prisma/seed.ts`, `app/(protected)/roles/actions.ts` (nouveau),
`app/(protected)/roles/CreateRoleDialog.tsx` (nouveau), `app/(protected)/roles/page.tsx`,
`lib/billing.test.ts`.

Vérifications effectuées : `npx tsc --noEmit`, `npx eslint` (fichiers touchés),
`npx vitest run` (41 tests, dont 4 nouveaux pour `isEnterpriseOrganization`),
`npx next build`, `npx tsx prisma/seed.ts` (plan Enterprise créé sans erreur).

## Captures attendues
Création d'un rôle custom avec permissions choisies, refus de création pour une
organisation hors plan Enterprise.

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-17 (implement) — démarrage
- 2026-07-17 (implement) — implémenté : `isEnterpriseOrganization` (`lib/billing.ts`) +
  plan "Enterprise" seedé ; `createRoleAction` (nouveau, gardé par ce plan) crée un
  `Role` non-système sans permission, à compléter ensuite via `PermissionMatrix`
  existante (`/roles/[id]`, ITEM-019) qui couvrait déjà le sous-ensemble arbitraire de
  permissions ; bouton "Créer un rôle" sur `/roles` conditionné au plan. Fichiers :
  lib/billing.ts, lib/organization.ts, lib/validators/organization.ts,
  lib/audit-labels.ts, prisma/seed.ts, app/(protected)/roles/actions.ts,
  app/(protected)/roles/CreateRoleDialog.tsx, app/(protected)/roles/page.tsx,
  lib/billing.test.ts.
