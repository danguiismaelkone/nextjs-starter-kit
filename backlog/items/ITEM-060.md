---
id: ITEM-060
title: Cache et optimisation des requêtes
status: implemented
priority: P2
type: chore
estimate: S
depends_on: []
created: 2026-07-16
updated: 2026-07-16
---

## Idée / contexte
Avec le multi-tenant et de nombreux modules (documents, facturation, notifications), les
requêtes Prisma peuvent se multiplier inutilement sur les pages à fort trafic
(dashboard, listes).

## User story
En tant qu'utilisateur, je veux que les pages fréquemment consultées se chargent
rapidement, afin d'avoir une expérience fluide.

## Critères d'acceptation
- [x] Les requêtes Prisma coûteuses et peu volatiles (ex. stats dashboard) sont mises
      en cache (`unstable_cache`/`revalidateTag`) avec une invalidation explicite lors
      des mutations concernées.
- [x] Les listes principales (utilisateurs, documents) évitent le N+1 (requêtes
      `include`/`select` ciblées, pas de boucle de requêtes) — déjà le cas avant cet
      item, vérifié et documenté ci-dessous plutôt que réécrit sans besoin.

## Notes techniques
Fichiers : `lib/cache.ts`, `lib/dashboard.ts`,
`app/(protected)/admin/users/actions.ts`, `app/invite/accept/actions.ts`,
`lib/organization.ts`.

Décisions à l'implémentation :
- **Cache (critère 1)** : `getStats`/`getChartData` (`lib/dashboard.ts`) — seules
  requêtes du repo correspondant à « coûteuses et peu volatiles » (stats du
  tableau de bord, dérivées de `User`/`Membership`) — enveloppées dans
  `unstable_cache`, clé = nom logique + `organizationId` (ou `"global"`), tag
  `dashboard-stats:<organizationId>` (`lib/cache.ts#dashboardStatsTag`) +
  `revalidate: 60` en filet de sécurité. `lib/cache.ts` centralise le nom du tag
  et la durée (`DASHBOARD_CACHE_REVALIDATE_SECONDS`/`DASHBOARD_CACHE_PROFILE`)
  pour que producteur (`lib/dashboard.ts`) et consommateurs (points
  d'invalidation) restent synchronisés sans dupliquer la valeur.
- **`revalidateTag` exige un 2ᵉ argument `profile`** dans cette version de
  Next.js 16 (`revalidateTag(tag: string, profile: string | { expire: number })`,
  changement de signature vs. les versions antérieures/la doc historique) —
  découvert via `tsc --noEmit` (`Expected 2 arguments, but got 1`) ; réutilise
  `DASHBOARD_CACHE_PROFILE` (`{ expire: 60 }`, même durée que le TTL du cache)
  plutôt qu'une chaîne magique.
- **Invalidation à chaque mutation de `Membership` sur une organisation
  existante** (change `totalUsers`/`newUsersThisMonth`) : `createUserAction` et
  `removeMemberAction` (`app/(protected)/admin/users/actions.ts`),
  `acceptInvitationAction` (`app/invite/accept/actions.ts`). **Pas** dans
  `createOrganizationWithOwner` (`lib/organization.ts`) — l'organisation n'existe
  pas avant cet appel, donc aucune entrée de cache ne peut déjà exister pour son
  id ; commentaire laissé en place pour ne pas laisser croire à un oubli.
  `updateUserAction`/`setUserDisabledAction` non touchés : ils ne modifient que
  `User.name`/`role`/`disabledAt`, jamais l'appartenance (`Membership`), donc ne
  changent aucun des deux compteurs mis en cache.
- **N+1 (critère 2)** : audit du chemin de lecture des deux « listes
  principales » citées par le critère —
  `listFolderContents` (`lib/documents.ts`, utilisée par `/documents` et
  `/documents/[folderId]`) fait déjà 2 `findMany` en parallèle (`Promise.all`),
  `uploadedBy` joint via `include: { uploadedBy: { select: { name: true } } }` —
  aucune requête par ligne. La page `/admin/users` fait déjà un seul
  `findMany` paginé + `count`, sans `include` supplémentaire (rôle/statut lus
  directement sur `User`, pas sur `Membership`). Aucun changement de code requis
  pour ce critère — vérifié plutôt que supposé. Seul point notable :
  `getFolderPath` (`lib/documents.ts`, fil d'Ariane) fait une requête par niveau
  d'ancêtre dans une boucle `while` — un N+1 en forme, mais qui varie avec la
  **profondeur de l'arborescence** (bornée à 100, typiquement 1-5 en pratique),
  pas avec la **taille de la liste** affichée ; hors du périmètre du critère
  (qui vise les listes elles-mêmes), laissé tel quel.
- Vérifié fonctionnellement en dev (pas seulement lu) : instrumentation
  temporaire (`console.log` dans `getStats`, retirée après coup) + un compte
  réel (`owner@example.com`) piloté via Playwright pour de vraies créations
  d'utilisateur (`createUserAction`, formulaire réel `/admin/users`). Résultat
  net dans les logs serveur, sur 3 cycles indépendants : plusieurs `GET
  /dashboard` consécutifs → une seule exécution réelle de la requête (cache
  hit) ; immédiatement après chaque `POST /admin/users` (mutation) → une
  nouvelle exécution garantie au chargement suivant, pas d'attente du TTL de
  60 s. Comptes de test et scripts ad hoc supprimés après vérification.
  `tsc --noEmit`, `eslint .`, `pnpm test` (28/28) et `next build` (production)
  tous clean.

## Captures attendues
N/A (mesurable via le nombre de requêtes SQL générées, pas de capture visuelle
dédiée). Vérifié en dev via logs serveur (voir Notes techniques) : cache hit sur
chargements répétés, invalidation immédiate après mutation.

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-17 (implement) — démarrage
- 2026-07-17 (implement) — implémenté : `lib/cache.ts` (tag +
  profil/durée centralisés), `getStats`/`getChartData` (`lib/dashboard.ts`)
  enveloppées dans `unstable_cache`, `revalidateTag` ajouté aux 3 mutations de
  `Membership` qui changent ces compteurs (création/retrait de membre,
  acceptation d'invitation). Audité et confirmé sans changement requis pour le
  critère N+1 (listes documents/utilisateurs déjà en `findMany`/`include`
  ciblés). Fichiers : `lib/cache.ts`, `lib/dashboard.ts`,
  `app/(protected)/admin/users/actions.ts`, `app/invite/accept/actions.ts`,
  `lib/organization.ts` (commentaire). Vérifié fonctionnellement en dev
  (instrumentation temporaire + Playwright piloté sur un vrai flux de création
  d'utilisateur, 3 cycles) : cache réutilisé sur chargements répétés,
  invalidation immédiate après chaque mutation — voir Notes techniques.
  `tsc --noEmit`, `eslint .`, `pnpm test` et `next build` tous clean.
