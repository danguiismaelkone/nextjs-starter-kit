---
id: ITEM-034
title: Recherche de documents
status: implemented
priority: P2
type: feature
estimate: S
depends_on: [ITEM-028]
created: 2026-07-16
updated: 2026-07-16
---

## Idée / contexte
Avec une arborescence qui grossit (ITEM-029), naviguer manuellement devient inefficace ;
une recherche rapide par nom est indispensable.

## User story
En tant qu'utilisateur, je veux rechercher un document par nom, afin de le retrouver
rapidement sans naviguer dans l'arborescence.

## Critères d'acceptation
- [x] Barre de recherche sur `/documents` filtre par nom de fichier en temps réel
      (scoped à l'organisation active).
- [x] Les résultats affichent le chemin du dossier parent pour se situer dans
      l'arborescence.
- [ ] *(non applicable — exclusion de périmètre, pas un critère à cocher)* Hors
      périmètre de cet item : recherche plein texte dans le contenu des fichiers —
      à considérer en V2 avec une extraction de texte dédiée (voir ITEM-042 OCR).
      Confirmé : aucune recherche dans le contenu des fichiers n'a été implémentée,
      uniquement `contains` sur `Document.name`.

## Notes techniques
Recherche V1 = requête Prisma `contains` sur le nom (insensible à la casse) ; pas
d'indexation full-text pour cette passe, conforme au cadrage initial.

Décisions :
- **Vue remplacée, pas fusionnée.** Tant qu'une requête non vide est saisie, la
  barre de recherche (`components/documents/DocumentSearch.tsx`) remplace
  entièrement la vue normale (arborescence + upload + liste du dossier
  courant) par la liste de résultats, plutôt que de filtrer sur place — la
  recherche porte sur toute l'organisation (tous dossiers confondus), pas
  seulement le dossier affiché, un filtrage « sur place » aurait été trompeur
  (des résultats d'autres dossiers seraient apparus mélangés à la liste du
  dossier courant sans distinction visuelle claire).
- Clic sur un résultat navigue vers le dossier parent du document (ou la
  racine) plutôt que d'ouvrir directement l'aperçu (ITEM-030) : ouvrir
  l'aperçu depuis un résultat de recherche aurait demandé de faire traverser
  un état client à travers un changement de route, complexité non nécessaire
  pour ce que demande le critère (retrouver *où* se trouve le document).
- Debounce (250 ms) appliqué uniquement à la requête réseau, pas à la
  transition d'affichage (recherche → résultats) : l'utilisateur voit
  l'interface réagir immédiatement à la frappe (« temps réel », conforme au
  critère), seul l'appel à `/api/documents/search` est différé pour éviter une
  requête par frappe.
- `GET /api/documents/search?q=...` plafonné à 50 résultats (`take: 50`), sans
  pagination : cohérent avec l'estimation S et l'absence d'indexation
  full-text — au-delà, la recherche par nom seule montre ses limites, sujet à
  reconsidérer avec l'indexation full-text évoquée dans le critère 3.
- Chemin du dossier parent recalculé via `lib/documents.ts#getFolderPath`
  (déjà utilisée pour le fil d'ariane, ITEM-029), une seule fois par dossier
  distinct parmi les résultats (pas par résultat) pour éviter les appels
  redondants quand plusieurs documents partagent le même dossier.

Fichiers : `app/api/documents/search/route.ts`,
`components/documents/DocumentSearch.tsx`, `components/documents/DocumentsExplorer.tsx`
(intégration — remplace la note initiale `app/(protected)/documents/page.tsx`,
la recherche vit dans le composant client partagé par les deux routes de
navigation d'ITEM-029, pas dans la page racine seule).

Vérifications effectuées : `npx tsc --noEmit`, `npx eslint` (ciblé, y compris
correction d'une erreur `react-hooks/set-state-in-effect` en fusionnant les deux
effets debounce+fetch en un seul plutôt que deux effets chaînés), `npx next
build`, `curl` sur `/api/documents/search` (serveur de dev déjà lancé)
confirmant un `401` propre. Pas de vérification fonctionnelle authentifiée
(frappe progressive, résultats réels, navigation depuis un résultat) — à
couvrir par `backlog-test`.

## Captures attendues
Recherche tapée progressivement avec résultats filtrés en direct, incluant le chemin du
dossier parent ; navigation vers le dossier d'un résultat au clic.

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-16 (implement) — démarrage
- 2026-07-16 (implement) — implémenté : recherche par nom en temps réel
  (`GET /api/documents/search`, debounce réseau 250 ms), remplaçant la vue
  normale par les résultats avec chemin du dossier parent. Fichiers :
  `app/api/documents/search/route.ts`, `components/documents/DocumentSearch.tsx`,
  `components/documents/DocumentsExplorer.tsx`.
