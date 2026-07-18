---
id: ITEM-014
title: Onboarding — création d'organisation à l'inscription
status: verified
priority: P0
type: feature
estimate: M
depends_on: [ITEM-013, ITEM-002]
created: 2026-07-16
updated: 2026-07-16
---

## Idée / contexte
L'inscription actuelle (ITEM-002) crée un utilisateur seul, sans organisation. Une fois
le modèle Organization/Membership en place (ITEM-013), il faut créer ou rejoindre une
organisation au moment de l'inscription.

## User story
En tant que nouvel utilisateur, je veux créer mon organisation en m'inscrivant, afin de
commencer à utiliser la plateforme avec mes données isolées.

## Critères d'acceptation
- [x] Le flux d'inscription demande un nom d'organisation (ou le déduit du nom de
      l'utilisateur) et crée l'`Organization` + `Membership` `owner` correspondants.
- [x] Un utilisateur invité via lien (ITEM-016) rejoint l'organisation existante sans en
      créer une nouvelle.
- [x] Après inscription, l'utilisateur est redirigé vers le dashboard de son
      organisation.

## Notes techniques
`/register` fait un appel client `authClient.signUp.email()` direct (pas de Server
Action pour la création du compte lui-même) : la création d'organisation ne pouvait
donc pas se faire via `databaseHooks.user.create` (pas d'accès simple au nom
d'organisation saisi) ni être fusionnée dans l'appel de signup. Solution retenue,
cohérente avec le pattern déjà utilisé par `/invite/accept` : un second appel — ici
une Server Action `createOrganizationAction` dans `app/(auth)/register/actions.ts` —
juste après le `signUp.email()` réussi, avant la redirection.

`lib/organization.ts` : ajout de `createOrganizationWithOwner(userId, name)` (slug
déduit du nom, désambiguïsé en cas de collision via un suffixe numérique) et d'un
helper `slugify` local. `createOrganizationAction` est idempotente (relit
`getCurrentOrganization()` avant de créer, pour tolérer une double soumission).

Le critère « un utilisateur invité rejoint l'organisation existante sans en créer une
nouvelle » ne passe pas par `/register` (les invités s'inscrivent via
`/invite/accept`) : `app/invite/accept/actions.ts` (`acceptInvitationAction`) a été
étendu pour ajouter un `prisma.membership.upsert(...)` (rôle `admin`/`member` déduit
de `invitation.role`) dans la même transaction que la mise à jour du rôle et de
l'invitation — c'est la seule voie de création de `Membership` pour un invité, donc
aucune nouvelle organisation n'est jamais créée pour ce chemin.

Fichiers : `app/(auth)/register/page.tsx`, `app/(auth)/register/actions.ts` (nouveau),
`lib/organization.ts`, `app/invite/accept/actions.ts`.

## Captures attendues
Formulaire d'inscription avec champ organisation ; redirection vers le dashboard de la
nouvelle organisation après soumission.

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-16 (implement) — démarrage
- 2026-07-16 (implement) — implémenté : champ organisation sur `/register` + Server
  Action `createOrganizationAction` (crée Organization + Membership owner, slug
  désambiguïsé) ; `acceptInvitationAction` étendu pour rattacher l'invité à
  l'organisation existante via `membership.upsert` au lieu de le laisser sans
  organisation. Fichiers : app/(auth)/register/page.tsx,
  app/(auth)/register/actions.ts, lib/organization.ts, app/invite/accept/actions.ts.
  `tsc --noEmit`, `eslint` et `next build` OK ; `slugify` vérifié unitairement
  (accents, espaces, chaîne vide) ; aucune migration Prisma requise (schéma déjà posé
  par ITEM-013).
- 2026-07-16 (verify) — vérifié : les 3 critères sont satisfaits (revue de
  `app/(auth)/register/page.tsx`, `app/(auth)/register/actions.ts`,
  `lib/organization.ts`, `app/invite/accept/actions.ts`). `tsc --noEmit`, `eslint .`,
  `next build` et `prisma migrate status` OK (re-exécutés indépendamment). Aucun
  code mort. Deux observations non bloquantes consignées : (1) la boucle de
  désambiguïsation du slug (`lib/organization.ts:74-79`) est check-then-insert, pas
  atomique — risque de collision en cas d'inscriptions concurrentes de même nom ;
  (2) un utilisateur invité qui s'inscrit via `/register` avec son e-mail invité
  (au lieu de cliquer le lien) crée une nouvelle organisation au lieu de rejoindre
  celle de l'invitation — hors du périmètre littéral du critère (« invité via lien »).
