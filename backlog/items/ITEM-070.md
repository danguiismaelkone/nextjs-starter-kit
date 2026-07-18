---
id: ITEM-070
title: Seed de données de développement (organisation, owner, plans) + script reset
status: implemented
priority: P1
type: chore
estimate: S
depends_on: [ITEM-001, ITEM-013, ITEM-020]
created: 2026-07-16
updated: 2026-07-16
---

## Idée / contexte
Plusieurs items (ITEM-021 notamment) ont signalé qu'aucune donnée de test n'existe
par défaut : pas de `Plan` avec un `stripePriceId`, pas d'organisation/owner prêts à
l'emploi. Chaque développeur doit créer ces données à la main avant de pouvoir
exercer les flux Billing/Documents. Un script de seed rejouable, plus une commande
`pnpm reset` pour repartir d'une base propre, réduisent cette friction.

## User story
En tant que développeur, je veux un jeu de données par défaut (organisation, owner,
plans) et une commande pour réinitialiser la base, afin de pouvoir tester
l'application localement sans préparation manuelle.

## Critères d'acceptation
- [x] `prisma/seed.ts` crée, de façon idempotente (rejouable sans dupliquer ni
      planter) : une organisation par défaut avec ses rôles système, un utilisateur
      owner créé via l'API Better Auth (utilisable pour se connecter, pas une
      insertion Prisma brute qui casserait le hash de mot de passe), et au moins
      deux `Plan` par défaut (name/price/interval/features ; `stripePriceId` laissé
      vide ou configurable par variable d'environnement pour les environnements
      sans Stripe test configuré — voir note ITEM-021).
- [x] Le seed est déclenchable via `npx prisma db seed` (config dans
      `prisma.config.ts`, Prisma 7 — pas `package.json#prisma.seed`, obsolète).
- [x] `package.json` expose un script `reset` qui réinitialise la base (migrations)
      et rejoue le seed en une seule commande.
- [x] Les identifiants de l'owner seedé (email/mot de passe) sont affichés dans la
      sortie du script, jamais codés en dur ailleurs ni utilisés par défaut en
      production (garde explicite si `NODE_ENV=production`).

## Notes techniques
Aucun module FATIHOUNE ne couvre le seeding (absent de `_registry.json`) —
implémentation propre à ce projet.

- Owner créé via `auth.api.signUpEmail(...)` (Better Auth, `lib/auth.ts`) plutôt que
  `prisma.user.create` : Better Auth stocke le mot de passe hashé dans `Account`
  selon son propre schéma — une insertion Prisma directe produirait un compte
  impossible à authentifier. Vérifié en conditions réelles (voir plus bas).
- `tsx` ajouté en devDependency (aucun runner TypeScript n'existait dans ce repo) ;
  `prisma.config.ts` référence `migrations.seed: "tsx prisma/seed.ts"`.
- Idempotence par vérification d'existence avant création (pas de contrainte
  d'unicité ajoutée sur `Plan.name` pour un simple script de dev) : plans
  recherchés par `name`, owner par `email`, organisation via la `Membership` active
  de l'owner. Rejouer le script ne duplique rien (vérifié : 2 exécutions
  consécutives de `pnpm db:seed` → toujours 2 `Plan`, 1 `Organization`,
  1 `Membership`, 1 `Account` avec mot de passe hashé).
- `createOrganizationWithOwner()` (`lib/organization.ts`) est réutilisé tel quel
  pour créer l'organisation — seed les rôles système (ITEM-018) et l'essai gratuit
  (ITEM-024) gratuitement, sans code supplémentaire.
- **Découverte importante en testant `pnpm reset`** : `prisma migrate reset --force`
  n'exécute PAS automatiquement le seed configuré dans cette version de Prisma
  (vérifié : après reset seul, 0 ligne dans `Plan`/`Organization`/`User`) — contrairement
  au comportement historique de Prisma. Le script `reset` chaîne donc explicitement
  `prisma migrate reset --force && prisma db seed`. Sans ce chaînage explicite, le
  critère 3 (« réinitialise ET rejoue le seed ») aurait été silencieusement rompu.
- Garde de sécurité `NODE_ENV === "production"` → `throw` avant toute écriture.
- `pnpm reset` exécute `prisma migrate reset --force`, une action destructrice ; un
  garde-fou Prisma a d'ailleurs bloqué la première tentative (détection d'un agent
  IA) et j'ai obtenu le consentement explicite de l'utilisateur avant de le
  relancer avec `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` pour vérifier le
  critère 3 en conditions réelles sur la base de développement locale.

Fichiers : `prisma/seed.ts`, `prisma.config.ts`, `package.json` (+ devDependency `tsx`).

## Captures attendues
N/A (chore dev-tooling). Vérifié directement pendant l'implémentation : `pnpm
db:seed` deux fois de suite (idempotent, aucun doublon), puis `pnpm reset` (reset +
migrations + seed automatique) — les deux s'exécutent sans erreur sur la base de
développement locale. `backlog-test` peut se concentrer sur la connexion effective
avec l'owner seedé via l'UI.

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-16 (implement) — démarrage
- 2026-07-16 (implement) — implémenté : `prisma/seed.ts` (organisation + owner via
  Better Auth + plans par défaut, idempotent), `pnpm db:seed`/`pnpm reset`. Vérifié
  en conditions réelles sur la base locale (idempotence + reset complet), avec
  consentement explicite de l'utilisateur pour l'action destructrice de test.
  Fichiers : `prisma/seed.ts`, `prisma.config.ts`, `package.json`.
