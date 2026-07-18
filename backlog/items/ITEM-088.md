---
id: ITEM-088
title: Migrer les pages liste CRUD existantes vers l'en-tête généralisé (ITEM-085)
status: implemented
priority: P2
type: chore
estimate: S
depends_on: [ITEM-085]
created: 2026-07-18
updated: 2026-07-18
---

## Idée / contexte
`/admin/users` et `/admin/invitations` utilisent déjà `ListPageHeader` (ITEM-077/
078/080), mais dans sa version actuelle : `flex justify-between` sans grille 2/3-1/3
ni repli en menu. Une fois l'en-tête généralisé par ITEM-085, ces deux pages doivent
basculer dessus pour rester cohérentes avec le reste de l'application — sans quoi
elles seraient la seule exception au nouveau patron visuel.

## User story
En tant qu'utilisateur de l'application, je veux que les pages « Utilisateurs » et
« Invitations » suivent le même en-tête (grille 3 colonnes, repli en menu) que le
reste de l'application, afin d'avoir une expérience visuelle cohérente partout.

## Critères d'acceptation
- [x] `/admin/users` et `/admin/invitations` utilisent le composant d'en-tête
      généralisé d'ITEM-085 (et non plus l'ancienne version `flex justify-between`
      d'ITEM-077 si le composant a été renommé/déplacé).
- [ ] Le comportement de repli en menu (ITEM-085) est observable sur ces deux pages
      quand la largeur devient insuffisante pour leurs boutons d'action actuels.
      **Non coché** : ces deux pages n'ont chacune qu'une seule action (« Nouvel
      utilisateur »/« Inviter »), donc `PageHeader` ne rend jamais de menu de repli
      (`actions.length === 1`, voir décision d'ITEM-085) — rien à observer ici tant
      qu'aucune de ces pages n'a une deuxième action. Cohérent avec la note déjà
      posée sur ce même critère côté ITEM-085.
- [x] Les onglets (`ListPageTabs`) et cartes de statistiques (`CategoryStatCards`)
      existants sur ces pages restent inchangés et fonctionnels (hors périmètre de
      cet item).
- [ ] Aucune régression fonctionnelle (recherche, filtres par carte de statut,
      actions groupées du DataTable) après la migration — vérifié en conditions
      réelles (`next build` + `next start` ou dev server), pas seulement en lecture
      de code.
      **Non coché à ce stade** : le changement est un simple changement d'import
      (`ListPageHeader` → `PageHeader`, alias strictement équivalent depuis
      ITEM-085) sans toucher au DataTable, aux onglets ni aux cartes de statistiques
      — `next build` complet (61 routes) et `npx vitest run` (68 tests) passent sans
      régression, mais un clic réel sur recherche/filtres/actions groupées en
      navigateur reste du ressort de `backlog-test`, pas vérifié ici.

## Notes techniques
Fichiers concernés : `app/(protected)/admin/users/UsersPageClient.tsx`,
`app/(protected)/admin/invitations/InvitationsPageClient.tsx` (et
`UsersDataTable.tsx`/`InvitationsDataTable.tsx` si l'en-tête y est instancié plutôt
que dans le composant `*PageClient`). Si ITEM-085 a fait de `ListPageHeader` un
simple ré-export du nouveau composant généralisé, cet item peut se limiter à un
changement d'import ; sinon, adapter les props utilisées sur ces deux pages au
nouveau composant.

Décisions à l'implémentation :
- Changement strictement limité à l'import (`ListPageHeader` de `@/components/crud`
  → `PageHeader` de `@/components/layout/PageHeader`) et au nom du composant utilisé
  dans le JSX — les props (`title`, `description`, `actions`) sont identiques, aucune
  autre modification. Commentaires mentionnant `ListPageHeader.actions` mis à jour en
  `PageHeader.actions` dans `UsersDataTable.tsx`/`InvitationsDataTable.tsx` pour
  rester cohérents.
- `components/crud/ListPageHeader.tsx` (ré-export d'ITEM-085) n'a plus aucun
  consommateur dans l'app après cette migration, mais reste en place : c'est
  volontairement la garantie de rétrocompatibilité prévue par ITEM-085, pas du code
  mort à supprimer.

Vérifications effectuées : `npx tsc --noEmit`, `npx eslint .` (aucune erreur, un seul
warning préexistant sans rapport dans `app/(protected)/layout.tsx`), `npx next build`
(61 routes, aucune erreur), `npx vitest run` (68 tests, inchangés).

## Captures attendues
`/admin/users` et `/admin/invitations` avec le nouvel en-tête en pleine largeur, puis
en largeur réduite montrant le repli en menu si le nombre de boutons le justifie sur
ces pages.

## Journal
- 2026-07-18 (backlog) — créé pour éviter que les pages CRUD existantes (ITEM-077 à
  080) restent sur l'ancienne version de l'en-tête après la généralisation
  d'ITEM-085.
- 2026-07-18 (implement) — démarrage
- 2026-07-18 (implement) — implémenté : `UsersPageClient.tsx`/
  `InvitationsPageClient.tsx` pointent désormais sur `PageHeader`
  (`@/components/layout/PageHeader`) au lieu de `ListPageHeader`
  (`@/components/crud`) ; commentaires associés dans `UsersDataTable.tsx`/
  `InvitationsDataTable.tsx` mis à jour. 2/4 critères couverts sans réserve ; le
  repli en menu et la vérification interactive complète restent non cochés (notes
  dans Critères d'acceptation) — `tsc`/`eslint`/`next build`/`vitest` tous OK.
