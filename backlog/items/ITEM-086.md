---
id: ITEM-086
title: Gabarit de page fiche/détail — contenu 2/3 + panneau détails 1/3
status: implemented
priority: P2
type: feature
estimate: M
depends_on: [ITEM-085]
created: 2026-07-18
updated: 2026-07-18
---

## Idée / contexte
Captures d'écran de référence (fiche produit, fiche client d'un SaaS tiers) : une
page « fiche détail » (une seule ressource, pas une liste) suit toujours la même
structure sous l'en-tête (ITEM-085) :
1. Un fil d'Ariane optionnel au-dessus du titre (ex. « Produits > E2E Starter »).
2. Une grille de contenu à 2 colonnes : la colonne de gauche (~2/3) porte le contenu
   principal de la ressource (sections empilées : tarifs, périodes d'essai, ventes
   croisées…), la colonne de droite (~1/3) porte un panneau « Détails »/« Métadonnées »
   listant les attributs secondaires de la ressource (ID, dates, badges…).
3. Sur mobile/écran étroit, le panneau de droite passe sous le contenu principal
   plutôt que de créer un scroll horizontal.

Ce projet n'a aucun composant partagé pour ce patron aujourd'hui : les pages fiche
existantes (`/roles/[id]`) codent leur mise en page à la main, sans grille ni panneau
détails séparé. Cet item crée le gabarit réutilisable ; sa mise en application sur
des pages réelles est traitée par ITEM-087 (référence) et ITEM-089 (reste).

## User story
En tant que développeur de ce projet, je veux un composant de mise en page « fiche
détail » réutilisable (en-tête + grille contenu 2/3 + panneau détails 1/3), afin que
toute page présentant une ressource unique ait la même structure visuelle sans la
reconstruire à la main.

## Critères d'acceptation
- [x] Un composant de layout accepte un en-tête (celui d'ITEM-085, avec titre/
      sous-titre/actions), un fil d'Ariane optionnel, un contenu principal
      (`children` ou slot dédié) et un panneau détails optionnel (`children` ou slot
      dédié).
- [x] En largeur normale, le contenu principal occupe ~2/3 de la largeur à gauche, le
      panneau détails ~1/3 à droite, sur la même hauteur de départ.
- [x] Si aucun panneau détails n'est fourni, le contenu principal occupe toute la
      largeur (le composant ne force pas une colonne vide) — un usage sans panneau
      détails reste valide (ex. `/roles/[id]` qui n'a pas nécessairement besoin d'un
      panneau détails).
- [x] Sous un certain seuil de largeur, le panneau détails passe sous le contenu
      principal (une seule colonne), sans scroll horizontal ni superposition.
- [x] Le panneau détails est composé de sections libellées (ex. « Détails »,
      « Métadonnées ») affichant des paires clé/valeur, cohérent avec les captures de
      référence — sans imposer un schéma de données rigide (le contenu de chaque
      section reste à la charge de l'appelant).

## Notes techniques
Pas de module FATIHOUNE dédié (registre absent de ce projet). Nouveau composant
partagé, ex. `components/layout/DetailPageLayout.tsx` (ou `components/crud/` si jugé
plus cohérent avec `ListPageHeader`/`ListPageTabs` — à trancher à l'implémentation et
documenter dans le Journal). Grille CSS simple (`grid grid-cols-1 lg:grid-cols-3`
avec le contenu principal en `lg:col-span-2`) plutôt qu'une nouvelle dépendance de
layout.

Réutilise l'en-tête généralisé d'ITEM-085 (dépendance) — ne pas dupliquer sa logique
de titre/sous-titre/actions dans ce composant.

Hors périmètre : la migration de pages réelles vers ce gabarit (ITEM-087, ITEM-089).

Décisions à l'implémentation :
- **`components/layout/DetailPageLayout.tsx`** (nouveau, à côté de `PageHeader`) :
  `breadcrumbs?: { label; href? }[]` rendu avec les primitives shadcn déjà en place
  (`Breadcrumb`/`BreadcrumbItem`/`BreadcrumbLink`/`BreadcrumbPage`/
  `BreadcrumbSeparator`, `components/ui/breadcrumb.tsx`) plutôt qu'un fil d'Ariane
  maison ; `header: ReactNode` (pas de prop `title` dupliquée — l'appelant compose lui-
  même `<PageHeader />` et le passe tel quel, le layout n'a pas à connaître sa forme).
- **Grille `grid-cols-1 lg:grid-cols-3`** (seuil `lg`, 1024px) plutôt que `sm`
  (utilisé par `PageHeader` pour l'en-tête) : un panneau détails a besoin de plus de
  largeur qu'une simple zone de boutons avant de justifier une colonne séparée, sans
  quoi il se retrouverait trop étroit sur tablette portrait.
- **`DetailPanelSection`** exporté en plus du layout : composant de section
  « libellé + paires clé/valeur » (`Card`/`CardHeader`/`CardTitle`/`CardContent`
  existants) pour couvrir le dernier critère sans que chaque page fiche ne réinvente
  sa propre mise en forme de panneau — reste un composant séparé, pas imposé par
  `DetailPageLayout` (le prop `details` accepte n'importe quel `ReactNode`, une ou
  plusieurs `DetailPanelSection` empilées étant l'usage attendu).

Vérifications effectuées : `npx tsc --noEmit` et `npx eslint
components/layout/DetailPageLayout.tsx` sans erreur.

## Captures attendues
Une page de démonstration (ou la première page migrée, ITEM-087) montrant l'en-tête,
le contenu principal à gauche et le panneau détails à droite, puis la même page en
largeur réduite montrant le panneau détails repositionné sous le contenu.

## Journal
- 2026-07-18 (backlog) — créé à partir de captures d'écran demandant un gabarit de
  fiche détail commun (contenu 2/3, panneau détails 1/3). Dépend d'ITEM-085 pour
  l'en-tête, reste indépendamment vérifiable pour la grille de contenu.
- 2026-07-18 (implement) — démarrage
- 2026-07-18 (implement) — implémenté : `components/layout/DetailPageLayout.tsx`
  (nouveau — fil d'Ariane via les primitives `Breadcrumb` existantes, grille
  `lg:grid-cols-3` avec repli 1 colonne, `DetailPanelSection` pour les paires
  clé/valeur du panneau détails). Tous les critères couverts. `tsc`/`eslint` OK.
  Démonstration réelle sur une page laissée à ITEM-087.
