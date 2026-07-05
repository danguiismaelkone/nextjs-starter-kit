---
id: ITEM-006
title: Rôles utilisateur (user/admin) et contrôle d'accès
status: verified
priority: P1
type: feature
estimate: S
depends_on: [ITEM-001]
created: 2026-07-04
updated: 2026-07-04
---

## Idée / contexte
Le CRUD users (ITEM-007) et l'invitation (ITEM-008) doivent être réservés aux
administrateurs. Il faut un champ `role` et des garde-fous d'accès réutilisables.

## User story
En tant qu'administrateur, je veux que seules les personnes autorisées accèdent aux
fonctions d'administration, afin de protéger la gestion des utilisateurs.

## Critères d'acceptation
- [x] Le modèle `User` possède un champ `role` (`user` par défaut, `admin`).
- [x] Un helper serveur `requireAdmin()` (ou équivalent) protège les pages/actions admin et renvoie 403/redirection sinon.
- [x] Un utilisateur `user` qui tente d'accéder à une route admin est bloqué (redirigé ou 403).
- [x] Il existe un moyen documenté de promouvoir un premier admin (seed, script, ou variable d'env).
- [x] La session/le contexte expose le rôle courant côté serveur et client.

## Notes techniques
- Fichiers : `prisma/schema.prisma` (champ role), `lib/auth.ts` (exposer role dans la session), `lib/authorization.ts`.
- Envisager le plugin `admin` de Better Auth si pertinent, sinon rôle applicatif simple.
- Hors-périmètre : permissions fines / RBAC multi-rôles (au-delà de user/admin).

### Décisions prises
- **Rôle applicatif simple** retenu plutôt que le plugin `admin` de Better Auth :
  le périmètre se limite à `user`/`admin` sans bannissement/impersonation. Le
  plugin `admin` (plus lourd) pourra être introduit avec le CRUD (ITEM-007) si besoin.
- Champ `role` (`String @default("user")`) sur `User`, exposé dans la session via
  `user.additionalFields` (Better Auth). `input: false` empêche l'auto-attribution
  du rôle à l'inscription ; côté client, `inferAdditionalFields` type la session.
- Helpers dans `lib/authorization.ts` : `requireAdmin()` (pages → redirect),
  `requireAdminOrThrow()` (Route Handlers/Actions → `AuthorizationError` 401/403),
  plus `requireAuth()`, `getCurrentUser()`, `isAdmin()`.
- Un `user` non-admin sur `/admin` est redirigé vers `/dashboard` ; un anonyme vers `/login`.
- Promotion du premier admin : script `scripts/promote-admin.ts` (`pnpm promote-admin <email>`
  ou `ADMIN_EMAIL`), documenté dans le README. Dépendance `tsx` ajoutée (dev) pour l'exécuter.

## Captures attendues
- Un compte `user` naviguant sur `/admin` est redirigé (vers `/dashboard`).
- Un compte `admin` (promu via `pnpm promote-admin`) accède à `/admin` et voit la page d'administration.

## Journal
- 2026-07-04 (backlog) — créé
- 2026-07-04 (implement) — démarrage
- 2026-07-04 (implement) — implémenté : champ role + garde-fous requireAdmin, exposition session serveur/client, script de promotion. Fichiers : prisma/schema.prisma, lib/auth.ts, lib/auth-client.ts, lib/authorization.ts, app/admin/page.tsx, scripts/promote-admin.ts, package.json, README.md, prisma/migrations/20260704025701_add_user_role/
- 2026-07-04 (verify) — vérifié : revue OK (5/5 critères couverts), lint/types/build OK. Non bloquant : catch générique dans scripts/promote-admin.ts masque l'erreur réelle.
