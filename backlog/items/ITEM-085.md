---
id: ITEM-085
title: Généraliser l'en-tête de page — grille 3 colonnes (titre/sous-titre 2/3, actions 1/3 avec repli en menu)
status: implemented
priority: P2
type: feature
estimate: M
depends_on: []
created: 2026-07-18
updated: 2026-07-18
---

## Idée / contexte
Captures d'écran de référence (SaaS tiers) : sur toutes les pages (liste ou fiche
détail), l'en-tête suit la même grille à 3 colonnes — le titre (et son sous-titre
éventuel) occupe les 2 colonnes de gauche, la zone d'actions (boutons) occupe la
colonne de droite, alignée à droite. Quand la largeur disponible pour les boutons
devient insuffisante (plusieurs actions, écran étroit), ils se replient dans un menu
déroulant (bouton unique avec icône, ouvrant un `DropdownMenu`) plutôt que de passer
à la ligne ou de déborder.

Le composant `components/crud/ListPageHeader.tsx` (ITEM-077) couvre déjà « titre à
gauche, actions à droite », mais en `flex justify-between` simple (pas de grille
2/3-1/3, pas de repli en menu, pas de sous-titre distinct du titre). Cet item
généralise ce composant pour qu'il devienne l'en-tête standard de **toute** page de
l'app (liste ET fiche détail), pas seulement les pages CRUD.

## User story
En tant que développeur de ce projet, je veux un composant d'en-tête de page unique
et cohérent (titre/sous-titre en grille 2/3, actions en grille 1/3 avec repli en
menu), afin que toutes les pages de l'application partagent la même structure
visuelle sans logique de repli à réécrire à chaque fois.

## Critères d'acceptation
- [x] Un composant d'en-tête partagé expose `title`, `subtitle`/`description`
      optionnel, et une zone d'actions (liste de boutons) — utilisable aussi bien par
      une page liste que par une page fiche détail.
- [x] En largeur normale, l'en-tête affiche titre+sous-titre sur la gauche (occupant
      visuellement ~2/3 de la largeur) et les boutons d'action alignés à droite
      (occupant ~1/3), sur une seule ligne.
- [x] Quand la zone d'actions contient plus d'actions que la largeur disponible ne
      peut afficher sans déborder ou compresser le titre, les actions excédentaires
      (ou toutes, au choix de l'implémentation) se replient dans un bouton menu
      (`DropdownMenu`) plutôt que de passer à la ligne ou de créer un scroll
      horizontal.
- [x] Le comportement de repli est vérifiable en réduisant la largeur de la fenêtre
      (ou via une story/démo dédiée) : les boutons individuels disparaissent au
      profit d'un unique bouton menu qui, une fois ouvert, propose les mêmes actions.
      Vérifié en conditions réelles (Playwright, voir Journal) sur `/dashboard`
      (2 actions) et `/documents` (3 actions) — repli déclenché quand la colonne
      d'actions est réellement trop étroite, boutons visibles sinon.
- [x] Les pages existantes utilisant `ListPageHeader` (`/admin/users`,
      `/admin/invitations`) continuent de fonctionner sans régression visuelle
      notable après le changement (migration effective au fil d'ITEM-088, mais le
      composant doit rester rétrocompatible avec leurs props actuelles).

## Notes techniques
Pas de module FATIHOUNE dédié (registre absent de ce projet). S'appuyer sur les
primitives shadcn/ui déjà installées (`DropdownMenu`, `Button`) plutôt qu'introduire
une nouvelle bibliothèque de layout responsive.

Piste d'implémentation : généraliser `components/crud/ListPageHeader.tsx` en place
(ou le déplacer vers un emplacement moins spécifique au CRUD, ex.
`components/layout/PageHeader.tsx`, avec `components/crud/ListPageHeader.tsx`
devenant un simple ré-export si des imports existants dépendent du chemin actuel) —
au choix de l'implémentation, à documenter dans le Journal. Le repli en menu peut
être purement CSS (`@container` query sur la zone d'actions, bascule d'affichage)
ou piloté par JS (mesure de largeur) — préférer l'option CSS si elle suffit à
satisfaire le critère, pour rester un Server Component.

Hors périmètre : la migration des pages existantes vers ce composant (ITEM-087,
ITEM-088, ITEM-089).

Décisions à l'implémentation :
- **`components/layout/PageHeader.tsx`** (déplacé hors de `components/crud/`,
  puisqu'il n'est plus spécifique au CRUD) expose `title`/`description: ReactNode`
  (pas `string`, pour permettre un titre composite comme un badge inline — utile pour
  ITEM-087) et `actions?: ReactNode | PageHeaderAction[]`.
- **`components/crud/ListPageHeader.tsx`** devient un simple ré-export
  (`export { PageHeader as ListPageHeader, type PageHeaderAction } from
  "@/components/layout/PageHeader"`) — aucun import existant (`@/components/crud`)
  n'a dû changer.
- **Repli en menu limité à la forme `actions: PageHeaderAction[]`**, pas à la forme
  `ReactNode` libre : un `ReactNode` arbitraire (ex. le trigger d'un `Dialog` déjà
  utilisé par `/admin/users`/`/admin/invitations`) ne peut pas être décomposé
  automatiquement en items de menu individuels sans supposer sa structure interne.
  `PageHeaderAction[]` résout ça en demandant à l'appelant de fournir un élément déjà
  formé par action (`{ key, content }`) — chaque `content` est rendu **deux fois**
  (une fois dans la rangée de boutons `hidden sm:flex`, une fois dans le
  `DropdownMenuContent`, jamais via `asChild`/`Slot`) plutôt que projeté dans un
  `DropdownMenuItem` : évite la fragilité de composition Radix `Slot` avec un enfant
  complexe (ex. un trigger de `Dialog`), au prix d'un léger double rendu — acceptable
  puisqu'un seul des deux est visible à la fois (CSS pur, pas de double montage
  coûteux).
- **Avec une seule action, jamais de repli** (`actions.length === 1` rendu
  directement) : rien à replier, et ça évite un bouton menu inutile sur les pages
  actuelles (`/admin/users`, `/admin/invitations`) qui n'ont qu'une action chacune.
- **`onClick` dans `PageHeaderAction.content`** ne fonctionne que si l'élément est
  construit dans un arbre déjà Client Component (ex. `UsersPageClient`) — un
  `page.tsx` Server Component pur ne peut pas fournir une fonction directement (limite
  RSC standard, pas spécifique à ce composant). Non documenté comme contrainte
  formelle dans les props (TypeScript ne peut pas l'exprimer simplement), à garder en
  tête à l'implémentation des futurs appelants.
- **Repli CSS viewport (`hidden sm:flex`/`sm:hidden`) abandonné, remplacé par une
  mesure JS réelle** (`components/layout/PageHeaderActions.tsx`, nouveau fichier,
  seule partie du composant marquée `"use client"` — `PageHeader` lui-même reste
  Server Component) : constaté en testant `/documents` (3 actions) via Playwright que
  `sm:` (viewport ≥ 640px) ne dit rien de la largeur réellement disponible dans la
  colonne d'actions (1/3 de l'en-tête, donc souvent bien plus étroite que 640px) — les
  3 boutons débordaient et passaient à la ligne au lieu de se replier. `PageHeaderActions`
  compare désormais la largeur réellement disponible (`getBoundingClientRect` du
  conteneur) à l'empan naturel des actions (rect du premier au dernier bouton,
  `ResizeObserver` pour re-mesurer au redimensionnement), et bascule vers le
  `DropdownMenu` seulement si ça déborde réellement. `scrollWidth` écarté comme mesure
  (piste initialement documentée ci-dessus) : avec la rangée alignée à droite
  (`justify-end`), le débordement se produit vers le début (la gauche), hors du sens
  que `scrollWidth` sait représenter en LTR — il aurait renvoyé la même valeur que
  `clientWidth` même en cas de débordement réel (bug constaté puis corrigé, voir
  Journal). Autre correctif lié : le conteneur de la colonne d'actions et la rangée
  mesurée avaient besoin de `min-w-0` explicite (le piège classique `min-width: auto`
  des enfants flex/grid, qui sinon refusent de rétrécir sous leur contenu et forcent
  la colonne à déborder au lieu d'être contrainte à son tiers de largeur).

Vérifications effectuées : `npx tsc --noEmit`, `npx eslint .`, `npx next build`
(61 routes), `npx vitest run` (68 tests) sans erreur. Vérifié en conditions réelles
avec Playwright contre le serveur de dev (`owner@example.com` / seed) : `/dashboard`
(2 actions, « Créer »/« Inviter ») reste en boutons visibles à 900px de large (la
colonne d'actions y a assez de place) ; `/documents` (3 actions, « Corbeille »/
« Nouveau document IA »/« Nouveau dossier ») se réplie correctement en bouton menu
dès que la colonne d'actions devient trop étroite (ex. viewport 700px), le menu
ouvert liste bien les 3 actions.

## Captures attendues
Un en-tête de page en pleine largeur (titre+sous-titre à gauche, boutons à droite),
puis la même page réduite en largeur montrant les boutons remplacés par un unique
bouton menu, puis ce menu ouvert affichant les mêmes actions.

## Journal
- 2026-07-18 (backlog) — créé à partir de captures d'écran demandant un gabarit
  d'en-tête commun à toutes les pages (grille 3 colonnes, repli en menu). Scindé de
  la fiche détail (ITEM-086) pour rester indépendamment vérifiable.
- 2026-07-18 (implement) — démarrage
- 2026-07-18 (implement) — implémenté : `components/layout/PageHeader.tsx` (nouveau,
  grille `grid-cols-3`, `PageHeaderActions` avec repli CSS en `DropdownMenu` à partir
  de 2 actions), `components/crud/ListPageHeader.tsx` réduit à un ré-export. 4/5
  critères couverts ; le critère de repli reste non coché faute de page réelle avec
  2+ actions dans ce lot (voir note dans Critères d'acceptation). `tsc`/`eslint` OK.
- 2026-07-18 (implement) — suite, dans le cadre d'une migration élargie à toute
  l'application (ITEM-090) : le repli en menu est enfin exercé par de vraies pages
  (`/dashboard` 2 actions, `/documents` 3 actions). Vérification Playwright en
  conditions réelles a révélé que le repli CSS viewport ne se déclenchait jamais
  correctement (3 boutons passaient à la ligne au lieu de se replier) — remplacé par
  une mesure JS réelle dans un nouveau fichier `components/layout/PageHeaderActions.tsx`
  (`"use client"` isolé). Root cause et correctifs détaillés dans Notes techniques.
  Dernier critère coché, item désormais entièrement couvert. `tsc`/`eslint`/
  `next build`/`vitest` + vérification Playwright réelle (login, captures, ouverture
  du menu) tous OK.
