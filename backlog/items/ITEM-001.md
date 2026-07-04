---
id: ITEM-001
title: Mettre en place la fondation d'authentification (Better Auth + Prisma)
status: todo
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
- [ ] Better Auth est installé et configuré avec l'adapter Prisma (email/password activé).
- [ ] Le schéma Prisma contient les modèles requis (User, Session, Account, Verification) et migre sans erreur (`prisma migrate`).
- [ ] Un client auth serveur (`lib/auth.ts`) et un client navigateur (`lib/auth-client.ts`) sont exposés.
- [ ] Le route handler `app/api/auth/[...all]/route.ts` répond (GET/POST) sans erreur 500.
- [ ] Les variables d'env nécessaires (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`) sont documentées dans `.env` / README.
- [ ] Une session peut être créée et lue côté serveur (helper `getSession()` réutilisable).

## Notes techniques
- Fichiers : `lib/auth.ts`, `lib/auth-client.ts`, `app/api/auth/[...all]/route.ts`, `prisma/schema.prisma`.
- Générer le schéma Better Auth (CLI `@better-auth/cli generate`) puis migrer.
- Hors-périmètre : UI des pages (items dédiés), envoi d'e-mails (ITEM-005), rôles (ITEM-006).

## Captures attendues
Migration Prisma réussie en terminal ; réponse 200 sur une route auth ; tables créées en base.

## Journal
- 2026-07-04 (backlog) — créé
