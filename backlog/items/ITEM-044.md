---
id: ITEM-044
title: Génération de documents assistée par IA
status: implemented
priority: P3
type: feature
estimate: M
depends_on: [ITEM-039]
created: 2026-07-16
updated: 2026-07-16
---

## Idée / contexte
Démarrer un document (contrat, rapport) d'une page blanche est lent. Une génération
assistée par IA à partir d'une description donne un point de départ exploitable.

## User story
En tant qu'utilisateur, je veux générer un nouveau document à partir d'une description,
afin de démarrer d'une base plutôt que d'une page blanche.

## Critères d'acceptation
- [x] Formulaire « Nouveau document IA » : description + type de document → génère un
      fichier stocké dans l'espace documents (ITEM-028) de l'organisation.
- [x] Le document généré est éditable comme un document classique après création.

## Notes techniques
Fichiers : `app/(protected)/documents/generate/page.tsx`.

Décisions à l'implémentation :
- **Format du fichier généré : texte brut (`.txt`)**, pas de génération PDF/Word (aucune
  bibliothèque de ce type dans le projet, et hors périmètre — le critère demande « un
  fichier stocké », pas un format particulier). Le prompt système varie selon le
  « type de document » choisi (contrat/rapport/lettre/note/autre → gabarit de
  structure/ton), mais le format de sortie reste toujours du texte brut.
- **« Éditable comme un document classique »** (critère 2) : le document généré est un
  `Document` + `DocumentVersion` en tout point identiques à ceux créés par l'upload
  manuel (`app/api/documents/upload/route.ts`, même structure de création répliquée) —
  il hérite donc automatiquement de toutes les actions déjà existantes (renommer,
  déplacer, remplacer par une nouvelle version, partager, supprimer, télécharger).
  Aucune UI d'édition de contenu en ligne n'existe ailleurs dans ce repo pour aucun
  type de document ; ne pas en construire une ici serait un élargissement de
  périmètre — un document `.txt` généré se télécharge et se modifie comme n'importe
  quel fichier texte, puis se remplace via une nouvelle version.
- `app/api/documents/generate/route.ts` réutilise directement `generateText()` de
  `lib/ai.ts` (ITEM-039), sans nouvelle fonction dédiée — un appel texte simple
  suffit, contrairement à l'OCR/résumé qui avaient besoin de blocs de contenu
  document/image.
- La génération IA est tentée **avant** tout accès au stockage/DB : en cas d'échec
  (IA non configurée, erreur réseau), aucune ligne `Document`/`DocumentVersion`
  orpheline n'est créée (vérifié en dev).
- Bouton « Nouveau document IA » ajouté dans l'en-tête de `DocumentsExplorer.tsx`, à
  côté de « Nouveau dossier » — porte le `folderId` courant en paramètre de requête
  (`?folderId=`) pour que le document généré atterrisse dans le dossier depuis lequel
  l'action a été lancée (racine sinon), et redirige vers ce même dossier après
  génération pour une visibilité immédiate dans l'arborescence.

## Captures attendues
Formulaire de génération rempli, document généré visible dans l'arborescence
documents. Nécessite une vraie `ANTHROPIC_API_KEY` pour une génération réelle — non
disponible dans cet environnement (voir Journal pour ce qui a été vérifié
fonctionnellement malgré cela : gardes de validation, absence d'écriture orpheline en
cas d'échec IA).

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-16 (implement) — démarrage
- 2026-07-16 (implement) — implémenté : route `app/api/documents/generate/route.ts`
  (génère via `generateText()`, crée `Document`+`DocumentVersion` comme un upload
  classique), formulaire `GenerateDocumentForm.tsx` + page
  `app/(protected)/documents/generate/page.tsx`, bouton « Nouveau document IA » dans
  `DocumentsExplorer.tsx` (respecte le dossier courant). Fichiers :
  `app/api/documents/generate/route.ts`, `app/(protected)/documents/generate/page.tsx`,
  `components/documents/GenerateDocumentForm.tsx`,
  `components/documents/DocumentsExplorer.tsx`. `tsc --noEmit`, `eslint` et `next
  build` passent ; vérifié fonctionnellement en dev avec session réelle (gardes
  d'auth/validation, dossier de destination invalide → 404, 503 propre sans clé IA,
  aucune écriture orpheline en base en cas d'échec).
