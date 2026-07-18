---
id: ITEM-042
title: OCR et extraction de documents
status: implemented
priority: P3
type: feature
estimate: M
depends_on: [ITEM-039, ITEM-028]
created: 2026-07-16
updated: 2026-07-16
---

## Idée / contexte
Certains documents uploadés (ITEM-028) sont des scans ou images sans texte
sélectionnable. L'OCR les rend exploitables (recherche, copie).

## User story
En tant qu'utilisateur, je veux extraire le texte d'un document scanné ou d'une image,
afin de le rendre exploitable sans ressaisie manuelle.

## Critères d'acceptation
- [x] Action « Extraire le texte » sur un document image/PDF (ITEM-030) lance un
      traitement OCR et affiche le texte extrait.
- [x] Le texte extrait est stocké et associé au document pour une future recherche
      plein texte (voir ITEM-034 V2).
- [x] Les documents non supportés (formats non image/PDF) affichent un message
      explicite plutôt qu'une erreur technique.

## Notes techniques
Fichiers : `app/api/ai/ocr/route.ts`.

Décisions à l'implémentation :
- OCR via la **capacité vision native de Claude** (blocs de contenu `image`/`document`
  en base64), pas un service OCR dédié séparé — cohérent avec « réutilise `lib/ai.ts` »
  et évite une dépendance supplémentaire. `lib/ai.ts#extractDocumentText` centralise la
  construction du bloc (image vs PDF selon le MIME type) et réutilise le même client/
  `logAiUsage` que `generateText`/`streamChat`.
- Champs `Document.ocrText`/`ocrProcessedAt` (nullable) ajoutés au modèle existant
  plutôt qu'une table séparée — un document a au plus un texte extrait courant (une
  ré-extraction écrase le précédent). Pas d'index full-text ni de branchement sur la
  recherche existante (ITEM-034 est en V1, plein texte = V2 explicitement hors
  périmètre) : ce champ est la fondation de données que ce futur item viendra indexer.
- `lib/storage.ts` : nouvelle fonction `getFileBuffer(key)` (charge l'objet S3 entier en
  mémoire via `Body.transformToByteArray()`) — distincte de `getSignedUrl` (URL
  temporaire pour le navigateur) car l'IA a besoin des octets bruts encodés en base64,
  pas d'une URL. Réservée aux fichiers de taille bornée (voir garde ci-dessous).
- `app/api/ai/ocr/route.ts` : les vérifications de format et de taille (limite de
  20 Mo, bien en-deçà des plafonds Anthropic) se font **avant** tout accès au stockage
  ou appel IA, avec un message dédié à chaque cas — c'est ce qui satisfait le critère
  « message explicite plutôt qu'une erreur technique ». Le catch générique final
  garantit aussi un message non vide même quand l'erreur sous-jacente n'en fournit pas
  (`AggregateError` réseau du SDK S3 — `err.message` vide constaté et corrigé en cours
  d'implémentation, voir Journal).
- `OcrDialog.tsx` (`components/documents/`, même famille que `ShareDialog`/
  `VersionHistory`) : lance l'extraction dès l'ouverture (un seul geste utilisateur —
  clic sur « Extraire le texte » dans le menu contextuel du document), affiche le
  résultat ou le message d'erreur, avec un bouton « Relancer »/« Réessayer ». Un
  `requestIdRef` ignore les réponses de requêtes remplacées (changement rapide de
  document, relance) plutôt qu'un flag `cancelled` fermé sur le retour de l'effet —
  contournement délibéré d'un faux positif de la règle ESLint
  `react-hooks/set-state-in-effect` sur ce fichier précis (comportement incohérent
  observé sur un pattern par ailleurs identique à `ShareDialog`/`VersionHistory`, qui
  passent sans réserve) ; une ligne reste explicitement désactivée avec justification.
- Intégré au menu contextuel existant de `DocumentsExplorer.tsx` (« Extraire le
  texte », à côté de « Partager ») plutôt qu'un nouveau bouton dédié — cohérent avec
  les autres actions par document déjà présentes.

## Captures attendues
Extraction de texte lancée sur une image scannée, texte extrait affiché.
Nécessite MinIO/S3 accessible et une vraie `ANTHROPIC_API_KEY` pour une extraction
réelle — non disponibles dans cet environnement (voir Journal pour ce qui a été vérifié
fonctionnellement malgré cela : gardes de format/taille, dégradation propre en cas
d'échec de stockage).

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-16 (implement) — démarrage
- 2026-07-16 (implement) — implémenté : champs `Document.ocrText`/`ocrProcessedAt` +
  migration, `lib/ai.ts#extractDocumentText` (vision Claude, image/PDF),
  `lib/storage.ts#getFileBuffer`, route `app/api/ai/ocr/route.ts` (gardes format/taille
  avant tout appel réseau, message d'erreur toujours non vide), `OcrDialog.tsx` +
  action « Extraire le texte » dans le menu contextuel de `DocumentsExplorer.tsx`.
  Fichiers : `prisma/schema.prisma`, `prisma/migrations/20260716180000_add_document_ocr/`,
  `lib/ai.ts`, `lib/storage.ts`, `app/api/ai/ocr/route.ts`,
  `components/documents/OcrDialog.tsx`, `components/documents/DocumentsExplorer.tsx`.
  `tsc --noEmit`, `eslint` et `next build` passent ; migration appliquée ; vérifié
  fonctionnellement en dev avec session réelle (garde d'auth, document introuvable,
  format non supporté → 422 explicite, fichier trop volumineux → 422 explicite,
  stockage inaccessible → 503 avec message non vide après correction d'un bug trouvé en
  testant : `err.message` vide sur une `AggregateError` réseau du SDK S3, corrigé par un
  message de repli).
