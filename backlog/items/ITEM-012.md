---
id: ITEM-012
title: Ajouter les sections de cartes secondaires (mise en avant + ressources)
status: implemented
priority: P2
type: feature
estimate: S
depends_on: [ITEM-010]
created: 2026-07-15
updated: 2026-07-16
---

## Idée / contexte
En bas du dashboard Claude Console, deux grilles de cartes complètent la page :
une grille "Modèles" (options mises en avant, avec icône + tags) et une grille
"Ressources" (raccourcis/fonctionnalités avec titre + description courte). On
reprend ce pattern visuel avec du contenu générique, à adapter une fois le
contenu réel du produit défini.

## User story
En tant qu'utilisateur connecté, je veux voir en bas du dashboard des raccourcis
vers les fonctionnalités ou offres importantes, afin de découvrir des options
que je n'utilise pas encore.

## Critères d'acceptation
- [x] Une grille de cartes "mise en avant" (icône colorée, titre, tags courts) s'affiche, avec 3 à 4 entrées cliquables (placeholder de contenu, lien vers une page ou une action).
- [x] Une grille de cartes "ressources" (icône, titre, courte description) s'affiche sous la précédente, avec 3 à 4 entrées.
- [x] Les deux grilles sont responsive (1 colonne mobile → 3-4 colonnes desktop) et gardent une hauteur de carte cohérente.
- [x] Le contenu des cartes est centralisé dans un fichier de configuration simple (tableau JS/TS), pas dupliqué en dur dans le JSX de la page.

## Notes techniques
- Pattern purement présentationnel : pas besoin du module `dashboard` ici, composants shadcn `Card` + `Badge` suffisent.
- Fichiers : `components/dashboard/HighlightGrid.tsx`, `components/dashboard/ResourceGrid.tsx`, `lib/dashboard-content.ts` (données statiques des cartes).
- Contenu à considérer comme temporaire : remplacer les libellés/icônes par les vraies offres/fonctionnalités du produit dès qu'elles sont connues.
- Hors-périmètre : logique métier derrière chaque carte (juste l'affichage + navigation).

## Captures attendues
Page dashboard avec les deux grilles de cartes visibles sous le graphique d'activité, rendu cohérent en desktop et mobile.

## Journal
- 2026-07-15 (backlog) — créé
- 2026-07-16 (implement) — démarrage
- 2026-07-16 (implement) — implémenté : grilles `HighlightGrid` (4 entrées, icône + titre + tags) et `ResourceGrid` (4 entrées, icône + titre + description), contenu centralisé dans `lib/dashboard-content.ts`, cartes cliquables (`Link`) vers des pages existantes (`/admin/users`, `/admin/invitations`, `/profile`, `/settings`) ou placeholder `#`. Ajoutées sous le graphique d'activité, avec skeletons de chargement assortis. Fichiers : lib/dashboard-content.ts, components/dashboard/HighlightGrid.tsx, components/dashboard/ResourceGrid.tsx, app/(protected)/dashboard/page.tsx, app/(protected)/dashboard/loading.tsx. Typecheck et lint OK.
