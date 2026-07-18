---
id: ITEM-052
title: Feature flags
status: implemented
priority: P3
type: feature
estimate: S
depends_on: [ITEM-050]
created: 2026-07-16
updated: 2026-07-16
---

## Idée / contexte
Pour déployer progressivement de nouvelles fonctionnalités (bêta, plans spécifiques)
sans redéploiement, un système de feature flags par organisation est utile sur un SaaS
Core réutilisable.

## User story
En tant que super-admin, je veux activer/désactiver des fonctionnalités par
organisation, afin de déployer progressivement de nouvelles features sans
redéploiement.

## Critères d'acceptation
- [x] Modèle `FeatureFlag` (key, description) et `OrganizationFeatureFlag`
      (organizationId, key, enabled).
- [x] Helper `isFeatureEnabled(orgId, key)` utilisable côté serveur pour conditionner
      l'affichage/l'accès.
- [x] Interface super-admin pour activer un flag sur une organisation spécifique.

## Notes techniques
`FeatureFlag.key` est la clé primaire (pas de `cuid()` séparé) : un flag est un
identifiant de code stable, pas une entité qu'on référence par id opaque.
`OrganizationFeatureFlag` a une FK vers `FeatureFlag.key` (`onDelete: Cascade`) —
supprimer un flag du catalogue purge ses activations.

`isFeatureEnabled(orgId, key)` renvoie `false` en l'absence de ligne
`OrganizationFeatureFlag` : un flag est désactivé par défaut, opt-in explicite
par organisation depuis la console super-admin (jamais activé globalement à la
création du flag).

**Catalogue défini par le seed** (`prisma/seed.ts`, `ensureFeatureFlags`), pas de
création de flag depuis l'UI — cohérent avec le critère d'acceptation qui ne
demande qu'une interface d'*activation par organisation*, pas de CRUD sur
`FeatureFlag`. Un flag de démo `advanced-analytics` est seedé (désactivé par
défaut) pour rendre la fonctionnalité testable.

Interface : `/superadmin/flags` (recherche d'organisation par nom, puis liste
des flags avec `Switch` par flag, bascule optimiste — même schéma que
`PermissionMatrix`, ITEM-019). Lien "Flags" ajouté sur chaque ligne de
`/superadmin` (organisations) et entrée de nav "Feature flags" dans la sidebar
super-admin. Toggle journalisé (`feature_flag.toggled`, `AuditLog`, ITEM-051).

Pour rendre le helper effectivement "utilisable côté serveur pour conditionner
l'affichage" (et pas seulement défini sans appelant), `advanced-analytics` gate
une bannière additive sur `/dashboard` (rien de caché si désactivé, une section
apparaît si activé) — démonstration volontairement non destructive, aucune
fonctionnalité existante n'est retirée pour les organisations sans le flag.

Vérifié en local (dev server + Postgres réel) : flag désactivé par défaut sur le
tableau de bord de l'organisation de démo, activation reflétée immédiatement par
`isFeatureEnabled()` (bannière visible) et par le `Switch` de
`/superadmin/flags` (`aria-checked`/`data-state`), désactivation confirmée en
sens inverse.

Fichiers : `prisma/schema.prisma`, `lib/feature-flags.ts`,
`app/(protected)/superadmin/actions.ts`, `app/(protected)/superadmin/flags/page.tsx`,
`app/(protected)/superadmin/flags/FeatureFlagToggleList.tsx`,
`app/(protected)/superadmin/page.tsx`, `components/layout/AppSidebar.tsx`,
`app/(protected)/dashboard/page.tsx`, `lib/audit.ts`, `prisma/seed.ts`.

## Captures attendues
Flag activé pour une organisation depuis la console super-admin, fonctionnalité visible
uniquement pour cette organisation.

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-16 (implement) — démarrage
- 2026-07-16 (implement) — implémenté : modèles `FeatureFlag`/`OrganizationFeatureFlag`,
  helper `isFeatureEnabled`, console `/superadmin/flags` (recherche d'organisation +
  bascule par flag), flag de démo `advanced-analytics` gating une bannière sur
  `/dashboard`. Fichiers : `prisma/schema.prisma`, `lib/feature-flags.ts`,
  `app/(protected)/superadmin/actions.ts`, `app/(protected)/superadmin/flags/page.tsx`,
  `app/(protected)/superadmin/flags/FeatureFlagToggleList.tsx`,
  `app/(protected)/superadmin/page.tsx`, `components/layout/AppSidebar.tsx`,
  `app/(protected)/dashboard/page.tsx`, `lib/audit.ts`, `prisma/seed.ts`.
