---
id: ITEM-077
title: Gabarit de page liste CRUD — en-tête, onglets, cartes de statistiques filtrables
status: implemented
priority: P2
type: feature
estimate: M
depends_on: []
created: 2026-07-18
updated: 2026-07-18
---

## Idée / contexte
Capture d'écran de référence (page « Catalogue de produits » d'un SaaS tiers) :
au-dessus de la DataTable elle-même (ITEM-076), les pages CRUD de ce projet doivent
partager un même gabarit visuel :
1. En-tête : titre à gauche, boutons d'action à droite (ex. « Créer », action
   secondaire).
2. Onglets vers les pages liées à la même ressource (si plusieurs existent).
3. Cartes de statistiques par catégorie (si pertinent pour la ressource), cliquables
   pour filtrer la table par cette catégorie — le clic change l'URL (paramètre de
   requête), pas seulement un état local perdu au rechargement.

Le module FATIHOUNE `datatable` documente explicitly que ces éléments (cartes de
stats, onglets) sont des composants **séparés**, au-dessus de la DataTable — cet
item les traite donc indépendamment d'ITEM-076.

## User story
En tant que développeur de ce projet, je veux un gabarit de page réutilisable
(en-tête + onglets + cartes de statistiques filtrables), afin que chaque page liste
CRUD ait la même structure sans la reconstruire à la main à chaque fois.

## Critères d'acceptation
- [x] Un composant d'en-tête réutilisable : titre à gauche, zone d'actions à droite
      (boutons), utilisable par toute page liste avec un minimum de props.
- [x] Un composant d'onglets réutilisable pour naviguer entre des pages liées à la
      même ressource (actif visuellement selon la route courante).
- [x] Un composant de cartes de statistiques par catégorie : affiche un total par
      catégorie, cliquable, l'état actif reflète le paramètre d'URL courant.
- [x] Cliquer une carte de statistique mute le paramètre de requête de filtre dans
      l'URL (ex. `?status=active`) — rechargement de la page ou mise à jour
      côté client, au choix, mais l'URL doit refléter le filtre actif (partageable/
      rechargeable sans perdre le filtre).
- [x] Les composants sont indépendants les uns des autres (une page peut utiliser
      seulement l'en-tête sans onglets ni cartes de stats si elle n'en a pas besoin)
      — pas un unique wrapper rigide imposant les trois blocs.
- [x] Démontré sur au moins une page réelle du projet (recommandé : la même page que
      ITEM-078 pour prouver la composition avec le DataTable enrichi d'ITEM-076).

## Notes techniques
Pas de module FATIHOUNE dédié à ce gabarit précis (le module `datatable` traite
explicitement stats/onglets comme hors de son périmètre, et le module `crud` va bien
au-delà avec son système `EntityDetailPage` — écarté pour cet item, voir ITEM-076).
Convention propre à ce projet, cohérente avec ses primitives shadcn/ui déjà en place
(`Card`, `Badge`, `Button`) plutôt qu'un nouveau système de composants.

Pour la synchronisation URL ↔ filtre actif, s'appuyer sur le pattern déjà utilisé
dans ce repo (`<form method="get">` + `searchParams`, ex. `/settings/audit`) plutôt
que d'introduire une nouvelle bibliothèque de gestion d'état d'URL.

Fichiers attendus : nouveaux composants partagés (ex.
`components/crud/ListPageHeader.tsx`, `components/crud/ListPageTabs.tsx`,
`components/crud/CategoryStatCards.tsx`, noms indicatifs à ajuster à
l'implémentation).

Décisions à l'implémentation :
- **`ListPageHeader`/`CategoryStatCards`** : Server Components purs — aucune
  interactivité propre. Les cartes de statistiques sont de simples `<Link>` vers
  `?paramName=valeur` : la navigation Next.js (soft nav) suffit à satisfaire le
  critère « l'URL doit refléter le filtre actif », sans JS supplémentaire ni état
  client à synchroniser. `ListPageTabs` est le seul des trois à être un Client
  Component (`usePathname()` pour l'état actif) — vérifié que l'attribut
  `aria-current="page"` est déjà présent dans le HTML servi (pas seulement après
  hydratation), donc correctement rendu côté serveur.
- **`CategoryStatCards.value: string | null`** (pas une chaîne magique du type
  `"all"`) : `null` signifie explicitement « retire le paramètre de la query
  string » — plus clair qu'une valeur sentinelle à deviner.
- **Composition avec le DataTable enrichi (ITEM-076) sur `/admin/users`** : la
  carte de statistique clique change l'URL (`?status=...`), `page.tsx` applique ce
  filtre à la requête Prisma **initiale** (page 1, rendue côté serveur) — mais la
  chip de filtre « Statut » du `DataTable` (ITEM-076) est un état client
  indépendant qui repartait toujours à vide au montage, non synchronisé avec l'URL.
  Ajout d'une prop `initialFilters?: DataTableFilters` à `DataTableProps`
  (`components/data-table/types.ts`/`DataTable.tsx`, optionnelle, rétrocompatible)
  qui seed l'état interne des filtres — sans elle, la carte "Désactivés" active
  aurait filtré les données affichées sans que la chip corresponde visuellement.
  C'est le seul point de couplage entre ITEM-076 et ITEM-077 ; les 3 composants de
  cet item restent par ailleurs utilisables sans aucune dépendance au DataTable.
- **Comptes des cartes de statistiques toujours globaux** (indépendants du filtre
  `status`/`q` actuellement sélectionné) — 3 `prisma.user.count()` scopés à
  l'organisation, cohérent avec la capture de référence où « Tout / Actifs /
  Archivés » affichent des totaux stables quel que soit l'onglet actif.
- **Bouton « Créer » laissé dans le `toolbar` du `DataTable`** (inchangé depuis
  ITEM-076), pas déplacé dans `ListPageHeader.actions` sur cette page de démo :
  le mécanisme de rafraîchissement après création (`cellHelpers.refresh()`) est
  interne au `DataTable` et ne survivrait pas à une relocalisation naïve hors de
  son arbre (`router.refresh()` ne réinitialise pas l'état interne déjà monté
  d'un Client Component). Réconcilier proprement le placement de cette action
  avec le gabarit visuel de référence (titre+bouton sur la même ligne) est donc
  laissé à ITEM-078, qui migre `/admin/users` plus en profondeur ; `actions` reste
  `undefined` ici, un cas d'usage valide du composant.
- **Recherche par texte** (`<form method="get">` existant) laissée telle quelle,
  entre les cartes de statistiques et le DataTable — non couverte par cet item.

Vérifications effectuées : `npx tsc --noEmit`, `npx eslint .` (aucune erreur), `npx
vitest run` (68 tests, inchangés — composants de présentation, rien de nouveau à
tester unitairement en dehors de ce qui l'a déjà été pour ITEM-076). `npx next
build` OK. Testé en conditions réelles via `next build` + `next start` sur un port
séparé (arrêté après coup, dev server existant non touché) : `/admin/users` affiche
l'en-tête, les onglets (Utilisateurs actif via `aria-current="page"`, lien vers
Invitations), et les cartes Tout/Actifs/Désactivés avec les bons `href`
(`?status=active`/`?status=disabled`) ; `GET /admin/users?status=disabled` renvoie
bien 0 résultat (« Aucun utilisateur trouvé », l'unique compte de démo étant actif)
et `?status=active` renvoie bien la ligne de l'owner — confirme que le filtre par
carte atteint réellement la requête serveur, pas seulement l'apparence de la carte.

## Captures attendues
Page `/admin/users` avec en-tête, onglets (Utilisateurs/Invitations) et cartes de
statistiques (Tout/Actifs/Désactivés) ; une carte cliquée montrant le filtre actif,
l'URL mise à jour, et les données de la table effectivement filtrées en conséquence.

## Journal
- 2026-07-18 (backlog) — créé à partir d'une capture d'écran demandant un gabarit de
  page CRUD commun. Scindé d'ITEM-076 (DataTable) et ITEM-078 (migration de
  référence) pour rester sur des items indépendamment vérifiables.
- 2026-07-18 (implement) — démarrage
- 2026-07-18 (implement) — implémenté : `components/crud/` (`ListPageHeader`,
  `ListPageTabs`, `CategoryStatCards`, indépendants les uns des autres), `DataTable`
  étendu d'une prop `initialFilters` pour se synchroniser avec un filtre dérivé de
  l'URL, `/admin/users` démontre les trois composants combinés avec le DataTable
  enrichi d'ITEM-076 (cartes Tout/Actifs/Désactivés filtrant réellement la requête
  serveur). Fichiers listés en Notes techniques.
