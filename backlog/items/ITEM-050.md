---
id: ITEM-050
title: Console super-admin (comptes, organisations, suspension, impersonation)
status: implemented
priority: P1
type: feature
estimate: L
depends_on: [ITEM-013, ITEM-020]
created: 2026-07-16
updated: 2026-07-16
---

## Idée / contexte
Avec le multi-tenant (ITEM-013) et la facturation (ITEM-020) en place, l'opérateur de
la plateforme (nous, pas un client) a besoin d'une console distincte de l'admin
d'organisation pour gérer l'ensemble des comptes.

## User story
En tant que super-admin de la plateforme, je veux voir et gérer tous les
comptes/organisations/abonnements, afin de supporter les clients et déboguer des
problèmes.

## Critères d'acceptation
- [x] Rôle système `superadmin` distinct du rôle `admin` d'organisation, non
      attribuable depuis l'UI d'une organisation cliente.
- [x] Console `/superadmin` liste toutes les organisations avec leur statut
      d'abonnement (ITEM-020) et permet de suspendre/réactiver un compte.
- [x] Fonction d'impersonation : le super-admin peut se connecter en tant qu'un
      utilisateur pour déboguer, avec bannière visible indiquant le mode
      impersonation et action journalisée (ITEM-051).

## Notes techniques
Module `superadmin` FATIHOUNE (plugin `admin` de Better Auth) — dépend de
`roles-permissions`, `billing`, `multi-tenant`, `datatable`, tous couverts par les
items précédents.
Fichiers : `prisma/schema.prisma` (`User.banned`, `Session.impersonatedBy`),
`app/(protected)/superadmin/*`, `lib/auth.ts`.

**Décisions prises à l'implémentation :**
- Plugin Better Auth `admin` activé dans `lib/auth.ts` avec `adminRoles: ["superadmin"]`
  et `roles: { superadmin: adminAc, user: userAc }` (import `better-auth/plugins/admin/access`)
  — le plugin exige que chaque rôle listé dans `adminRoles` soit défini dans `roles`,
  il n'accepte pas un rôle arbitraire par défaut. `role` a été retiré de
  `user.additionalFields` (désormais porté par le plugin, qui l'expose déjà avec
  `input: false`).
- "Suspendre/réactiver un compte" = suspension d'un **compte utilisateur**
  (`User.banned` via `auth.api.banUser`/`unbanUser`, révoque ses sessions), pas d'un
  champ dédié sur `Organization` (le plugin admin opère sur des `User`, cohérent
  avec les notes techniques qui ne prévoyaient qu'un ajout schema côté `User`/`Session`).
  Deux pages : `/superadmin` (organisations, lecture seule, statut d'abonnement) et
  `/superadmin/users` (comptes, suspension + impersonation), reliées par un lien
  "Membres" par organisation (`?org=<id>`) sur la première.
- Impersonation en deux temps : `startImpersonationAction`/`stopImpersonationAction`
  (`app/(protected)/superadmin/actions.ts`) valident et journalisent (`AuditLog`,
  fondation ITEM-051, sous l'organisation principale du compte ciblé) *avant* que
  `authClient.admin.impersonateUser`/`stopImpersonating` (seul endroit où le cookie
  de session navigateur peut être remplacé) bascule effectivement la session —
  après bascule, l'appelant n'est plus authentifié en tant que super-admin.
- Seed (`prisma/seed.ts`) : compte `superadmin@example.com` / `password123` — seul
  moyen d'obtenir un compte super-admin, ce rôle n'étant attribuable depuis
  aucune UI.
- Vérifié en local (curl direct sur les endpoints Better Auth avec un cookie de
  session super-admin) : ban/unban, blocage de connexion d'un compte banni,
  impersonate/stop-impersonating (`Session.impersonatedBy` posé puis retiré).

## Captures attendues
Console listant les organisations avec statut d'abonnement, suspension d'un compte,
bannière d'impersonation active.

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-16 (implement) — démarrage
- 2026-07-16 (implement) — implémenté : rôle `superadmin` (plugin Better Auth
  `admin`), console `/superadmin` (organisations + statut d'abonnement) et
  `/superadmin/users` (suspension `User.banned` + impersonation), bannière
  d'impersonation, journalisation `AuditLog`, seed d'un compte de démo. Fichiers :
  `lib/auth.ts`, `lib/auth-client.ts`, `lib/authorization.ts`, `lib/organization.ts`,
  `prisma/schema.prisma`, `prisma/seed.ts`,
  `app/(protected)/superadmin/page.tsx`, `app/(protected)/superadmin/actions.ts`,
  `app/(protected)/superadmin/users/page.tsx`,
  `app/(protected)/superadmin/users/SuspendUserButton.tsx`,
  `app/(protected)/superadmin/users/ImpersonateButton.tsx`,
  `components/layout/ImpersonationBanner.tsx`, `components/layout/AppSidebar.tsx`,
  `app/(protected)/layout.tsx`.
