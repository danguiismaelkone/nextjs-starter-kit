---
id: ITEM-001
title: Mettre en place la fondation d'authentification (Better Auth + Prisma)
status: verified
priority: P0
type: feature
estimate: M
depends_on: []
created: 2026-07-04
updated: 2026-07-04
---

## Idée / contexte
Le starter n'a aucune authentification : pas de librairie, pas de modèle `User`,
pas de route auth. Tous les autres items (login, register, reset, invitations,
CRUD users) dépendent d'une fondation commune. On installe et configure Better Auth
avec l'adapter Prisma et le schéma de base.

## User story
En tant que développeur, je veux une fondation d'auth installée et configurée,
afin que les écrans et flux (login, register, reset, invitation) reposent sur une
base commune sécurisée.

## Critères d'acceptation
- [x] Better Auth est installé et configuré avec l'adapter Prisma (email/password activé).
- [x] Le schéma Prisma contient les modèles requis (User, Session, Account, Verification) et migre sans erreur (`prisma migrate`).
- [x] Un client auth serveur (`lib/auth.ts`) et un client navigateur (`lib/auth-client.ts`) sont exposés.
- [x] Le route handler `app/api/auth/[...all]/route.ts` répond (GET/POST) sans erreur 500.
- [x] Les variables d'env nécessaires (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`) sont documentées dans `.env` / README.
- [x] Une session peut être créée et lue côté serveur (helper `getSession()` réutilisable).

## Notes techniques
- Fichiers : `lib/auth.ts`, `lib/auth-client.ts`, `lib/prisma.ts`, `app/api/auth/[...all]/route.ts`, `prisma/schema.prisma`.
- Better Auth `1.6.23`, adapter Prisma (`better-auth/adapters/prisma`), `emailAndPassword.enabled = true`.
- **Prisma 7** : le `url` n'est plus autorisé dans `datasource` ni via `datasourceUrl`. On connecte via **driver adapter** `@prisma/adapter-pg` (`PrismaPg({ connectionString: DATABASE_URL })`) dans `lib/prisma.ts`. Client Prisma en singleton.
- Modèles créés manuellement (schéma standard Better Auth) plutôt que via la CLI (résolution de l'alias `@/` capricieuse) : `user`, `session`, `account`, `verification` (mappés en minuscules).
- `getSession()` (dans `lib/auth.ts`) enveloppe `auth.api.getSession({ headers })` pour les Server Components / Actions.
- Env ajoutées : `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_BETTER_AUTH_URL` (doc dans `.env` et `README.md`).
- Hors-périmètre : UI des pages (items dédiés), envoi d'e-mails (ITEM-005), rôles (ITEM-006).

## Captures attendues
Migration Prisma réussie en terminal ; réponse 200 sur une route auth ; tables créées en base.

## Journal
- 2026-07-04 (backlog) — créé
- 2026-07-04 (implement) — démarrage
- 2026-07-04 (implement) — implémenté : Better Auth + adapter Prisma (driver `@prisma/adapter-pg` pour Prisma 7), schéma migré, route handler, clients serveur/navigateur, `getSession()`. Vérifié au runtime : `/api/auth/ok` 200, sign-up 200 (user+session créés), get-session 200. Fichiers : lib/auth.ts, lib/auth-client.ts, lib/prisma.ts, app/api/auth/[...all]/route.ts, prisma/schema.prisma, prisma/migrations/*, .env, README.md.
- 2026-07-04 (verify) — vérifié : revue code OK (6/6 critères tracés), tsc OK, lint OK, build OK, `prisma migrate status` up-to-date, route `/api/auth/[...all]` présente au build. Sécurité : `.env` gitignored et non tracké (secret non commité).
