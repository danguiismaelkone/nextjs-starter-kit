---
id: ITEM-043
title: Résumé et analyse de documents
status: implemented
priority: P3
type: feature
estimate: M
depends_on: [ITEM-039, ITEM-028]
created: 2026-07-16
updated: 2026-07-16
---

## Idée / contexte
Les documents longs (rapports, contrats) prennent du temps à parcourir. Un résumé
automatique en donne l'essentiel rapidement.

## User story
En tant qu'utilisateur, je veux obtenir un résumé automatique d'un document long, afin
d'en saisir l'essentiel rapidement.

## Critères d'acceptation
- [x] Action « Résumer » sur un document texte/PDF génère un résumé structuré (points
      clés) affiché dans un panneau dédié.
- [x] Le résumé est mis en cache par document (pas régénéré à chaque ouverture) avec
      option « Régénérer ».

## Notes techniques
Fichiers : `app/api/ai/summarize/route.ts`.

Décisions à l'implémentation :
- **Périmètre volontairement restreint au PDF** : `ACCEPTED_UPLOAD_TYPES`
  (`app/api/documents/upload/route.ts`) n'accepte que `image/jpeg`, `image/png`,
  `image/webp` et `application/pdf` — le PDF est le seul type réellement « document
  texte » uploadable dans ce repo. Pas de support `text/plain`/`text/markdown` (aucun
  moyen d'en uploader un aujourd'hui) ni des images (hors du libellé « document
  texte/PDF » du critère — l'image est déjà couverte par l'OCR, ITEM-042).
  `lib/ai.ts#SUMMARIZE_SUPPORTED_MIME_TYPES = ["application/pdf"]`, vérifié côté route
  avant tout appel IA, avec message explicite sinon (même pattern que l'OCR).
- `lib/ai.ts#summarizeDocument` : même mécanique de lecture de document que
  `extractDocumentText` (ITEM-042, bloc `document` PDF envoyé à Claude), mais prompt
  système dédié au résumé structuré (Markdown : phrase d'ensemble + liste à puces des
  points clés) plutôt qu'à la transcription intégrale. Fonction indépendante plutôt que
  factorisée avec `extractDocumentText` — éviter de retoucher le code déjà vérifié
  d'ITEM-042 pour rester dans le périmètre de cet item ; légère duplication assumée,
  cohérente avec le style déjà présent dans ce fichier entre `generateText` et
  `extractDocumentText`.
- **Mise en cache** (critère 2) : `Document.summary`/`summaryUpdatedAt` (nullable).
  `GET /api/ai/summarize?documentId=` renvoie le résumé déjà en cache sans jamais
  appeler l'IA ; `POST` (re)génère et écrase le cache — utilisé à la fois pour la
  première génération et pour « Régénérer ». `SummaryDialog.tsx` appelle `GET` à
  l'ouverture ; si `summary` est `null` (jamais généré), il déclenche automatiquement
  un `POST` (un seul geste utilisateur pour la première fois) ; si un résumé existe
  déjà, il s'affiche directement sans regénérer — c'est ce qui distingue ce panneau de
  celui de l'OCR (ITEM-042, qui relance systématiquement à l'ouverture, sans cache).
- Même garde de taille (20 Mo) que l'OCR, et même correctif de robustesse
  (`err.message` non vide même sur une `AggregateError` réseau du SDK S3 —
  problème découvert et corrigé sur ITEM-042, appliqué ici dès l'écriture).
- Intégré au menu contextuel existant de `DocumentsExplorer.tsx` (« Résumer », à côté
  de « Extraire le texte »).
- Vérifié en dev (session réelle) : gardes d'auth/validation, format non supporté →
  422 explicite, fichier trop volumineux → 422 explicite, lecture d'un résumé
  pré-existant en cache sans régénération (`GET` renvoie le résumé tel quel), `GET` sur
  un document jamais résumé → `summary: null`, et `POST` avec stockage inaccessible →
  503 avec message non vide (pas de crash).

## Captures attendues
Résumé structuré affiché pour un document texte, option de régénération fonctionnelle.
Nécessite MinIO/S3 accessible et une vraie `ANTHROPIC_API_KEY` pour un résumé réel —
non disponibles dans cet environnement (voir Journal/Notes techniques pour ce qui a été
vérifié malgré cela : gardes de format/taille, cache, dégradation propre en cas
d'échec).

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-16 (implement) — démarrage
- 2026-07-16 (implement) — implémenté : champs `Document.summary`/`summaryUpdatedAt` +
  migration, `lib/ai.ts#summarizeDocument` (PDF uniquement, résumé structuré), route
  `app/api/ai/summarize/route.ts` (GET cache / POST génère-régénère, gardes
  format/taille), `SummaryDialog.tsx` (charge le cache, génère seulement si absent,
  bouton Régénérer) + action « Résumer » dans le menu contextuel de
  `DocumentsExplorer.tsx`. Fichiers : `prisma/schema.prisma`,
  `prisma/migrations/20260716190000_add_document_summary/`, `lib/ai.ts`,
  `app/api/ai/summarize/route.ts`, `components/documents/SummaryDialog.tsx`,
  `components/documents/DocumentsExplorer.tsx`. `tsc --noEmit`, `eslint` et `next
  build` passent ; migration appliquée ; vérifié fonctionnellement en dev avec session
  réelle (gardes, cache-hit sans régénération, cache-miss, 503 propre sans stockage).
