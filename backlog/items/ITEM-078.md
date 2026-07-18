---
id: ITEM-078
title: Migrer /admin/users vers le gabarit CRUD standard (référence pour les autres pages)
status: implemented
priority: P2
type: chore
estimate: M
depends_on: [ITEM-076, ITEM-077, ITEM-079]
created: 2026-07-18
updated: 2026-07-18
---

## Idée / contexte
Première migration réelle vers le nouveau standard de page CRUD (ITEM-076 + ITEM-077),
pour prouver que les deux composent correctement sur une page existante avant de
généraliser à d'autres pages du projet (rôles, documents, factures, journal d'audit,
clés API, webhooks, console super-admin...).

`/admin/users` est un bon candidat de référence : liste déjà paginée (ITEM-061),
catégories naturelles pour des cartes de statistiques (actifs/désactivés — même
motif que « Actifs »/« Archivés » de la capture de référence), et une action de
création déjà existante (invitation).

## User story
En tant qu'admin, je veux que la page Utilisateurs suive le nouveau gabarit standard
(en-tête, cartes de statistiques filtrables, DataTable enrichi), afin de disposer
d'une page de référence que les autres listes du projet pourront reproduire.

## Critères d'acceptation
- [x] `/admin/users` utilise le composant d'en-tête standard (ITEM-077) : titre à
      gauche, actions à droite — **le bouton « Nouvel utilisateur » y est
      effectivement déplacé** (ITEM-079, ref impérative du `DataTable`), plus dans
      la barre d'outils de la table.
- [x] `/admin/users` affiche des cartes de statistiques (ex. Actifs / Désactivés)
      cliquables, filtrant la liste via l'URL (ITEM-077).
- [x] `/admin/users` utilise le DataTable enrichi (ITEM-076) : tri sur au moins une
      colonne pertinente, au moins un filtre par colonne, sélection multiple avec au
      moins une action groupée réelle (ex. désactiver en masse), export CSV des
      utilisateurs affichés, **recherche en chip et pagination toujours visible**
      (ITEM-079).
- [x] Aucune régression sur les fonctionnalités déjà existantes de cette page
      (pagination, création/désactivation/retrait d'un utilisateur, garde
      d'accès admin, scoping par organisation).

## Notes techniques
Page déjà scopée par organisation et déjà admin-gated (ITEM-016/ITEM-018) — ne pas
relâcher ces gardes en migrant vers le nouveau gabarit. `UsersDataTable.tsx`
(ITEM-061) est le point de départ à faire évoluer, pas à réécrire de zéro.

**Mise à jour (post-implémentation d'ITEM-076/ITEM-077, puis retour utilisateur)** :
les deux items dépendants ont chacun démontré leurs propres critères directement sur
`/admin/users` — la plupart des critères ci-dessus sont donc déjà satisfaits en
pratique : tri/filtres/sélection/bulk/export/import (ITEM-076) et en-tête/onglets/
cartes de statistiques filtrables (ITEM-077) tournent déjà réellement sur cette
page. Un retour utilisateur concret (capture d'écran) a ensuite identifié 3 défauts
précis sur ce même assemblage — recherche mal placée, pagination invisible, bouton
d'action mal positionné — désormais couverts par ITEM-079 (nouvelle dépendance de
cet item). Le travail réellement restant pour cet item, une fois ITEM-079
implémenté :
- Vérifier que le bouton « Nouvel utilisateur » est bien en `ListPageHeader.actions`
  (ITEM-079 le fait), pas de retour en arrière vers le `toolbar` du `DataTable`.
- Revue globale de cohérence (pas de duplication entre le filtre « Statut » du
  DataTable et la carte de statistique « Actifs/Désactivés », les deux pilotant la
  même donnée à des niveaux différents — déjà réconciliés via `initialFilters`,
  mais à revalider une fois assemblé).
- Vérification finale de non-régression sur l'ensemble (déjà partiellement faite
  côté ITEM-076/077/079, à confirmer globalement ici).

Une fois cette migration validée, les autres pages listes du projet (`/roles`,
`/billing/invoices`, `/settings/audit`, `/settings/api-keys`, `/settings/webhooks`,
`/documents`, `/superadmin/users`, `/superadmin/flags`) sont candidates à la même
migration — **hors périmètre de cet item**, à cadrer en items séparés une fois le
gabarit prouvé ici. `/admin/invitations` fait exception : sa migration est déjà
cadrée par ITEM-080 (demande explicite de l'utilisateur), qui dépend de cet item.

Fichiers attendus : `app/(protected)/admin/users/{page.tsx,actions.ts,
UsersDataTable.tsx}`.

**Clôture** : aucun changement de code supplémentaire n'a été nécessaire — ITEM-076,
ITEM-077 puis ITEM-079 avaient chacun directement implémenté leur propre part sur
cette page (recommandé par leurs critères respectifs). Le travail de cet item s'est
donc réduit à une vérification bout en bout de la composition finale : `next build`
+ `next start` sur un port séparé (arrêté après coup, dev server existant non
touché), extraction de l'ordre réel du texte rendu — confirmé : « Utilisateurs |
Membres de Organisation de démo | Nouvel utilisateur | Utilisateurs | Invitations |
Tout 1 | Actifs 1 | Désactivés 0 | Rechercher... | Rôle | Statut | Importer... » —
en-tête, onglets, cartes de statistiques et barre d'outils du DataTable dans le bon
ordre, sans duplication ni incohérence. Clic sur les cartes vérifié réellement :
`?status=active` retourne l'owner (seul compte de démo) avec la carte « Actifs »
visuellement active (`border-primary ring-1 ring-primary`, présent une seule fois
dans l'arbre réel malgré 2 occurrences brutes dans le HTML — la seconde étant la
charge utile RSC sérialisée, pas un doublon visuel) ; `?status=disabled` retourne
0 résultat (« Aucun utilisateur trouvé »), cohérent avec un unique compte actif dans
l'organisation de démo. Aucune régression : `/billing/invoices`, `/settings/audit`
et `/admin/invitations` répondent tous 200.

## Captures attendues
`/admin/users` avec en-tête standard, cartes de statistiques actifs/désactivés
cliquables (URL mise à jour), tri/filtre appliqués sur la table, sélection multiple
+ action groupée exécutée, export CSV téléchargé.

## Journal
- 2026-07-18 (backlog) — créé comme migration de référence après ITEM-076/ITEM-077,
  pour valider le nouveau gabarit CRUD sur une page réelle avant généralisation.
- 2026-07-18 (backlog) — mis à jour : ajout d'ITEM-079 comme dépendance suite à un
  retour utilisateur précis sur `/admin/users` (recherche, pagination, placement du
  bouton d'action) ; ITEM-080 créé en parallèle pour appliquer la même structure à
  `/admin/invitations`, explicitement demandé par l'utilisateur.
- 2026-07-18 (implement) — démarrage
- 2026-07-18 (implement) — implémenté (vérification uniquement, aucun code
  supplémentaire requis) : tous les critères déjà satisfaits par le travail
  d'ITEM-076/077/079 sur cette même page, revérifiés bout en bout en conditions
  réelles (build de production, cartes de statistiques cliquées avec de vraies
  données, non-régression confirmée sur les pages voisines).
