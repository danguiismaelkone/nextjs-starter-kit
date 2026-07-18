---
id: ITEM-027
title: Configuration du stockage S3-compatible (MinIO/R2/S3)
status: implemented
priority: P1
type: feature
estimate: M
depends_on: [ITEM-013]
created: 2026-07-16
updated: 2026-07-16
---

## Idée / contexte
Base du module Documents : il faut un client de stockage objet configurable (MinIO en
local, R2/S3 en production), pour rester portable entre environnements et fournisseurs.

## User story
En tant que plateforme, je veux un client de stockage objet configurable, afin de
stocker les fichiers de façon portable entre environnements.

## Critères d'acceptation
- [x] `lib/storage.ts` expose `uploadFile`, `getSignedUrl`, `deleteFile` via un SDK
      S3-compatible (`@aws-sdk/client-s3`), configuré par variables d'environnement
      (endpoint, bucket, clés).
- [x] `docker-compose.yml` inclut un service MinIO pour le développement local (voir
      ITEM-064).
- [x] Les URLs de fichiers servies au client sont des URLs signées à expiration courte,
      jamais de bucket public par défaut.

## Notes techniques
Base du module `upload` FATIHOUNE, mais généralisée en client de stockage plutôt qu'en
composants UI seuls (le module `nextjs/module.md` ne fournit que des specs de
composants UI/hooks, pas de code de client de stockage — voir ITEM-028 pour l'UI
d'upload, qui consommera `lib/storage.ts`).

Décisions :
- Client S3 paresseux (`getStorageClient()`), même pattern que `getStripeClient()` —
  construit au premier appel plutôt qu'au chargement du module.
- `forcePathStyle` déduit de `S3_ENDPOINT` par défaut (`true` dès qu'un endpoint
  custom est fourni, ex. MinIO), mais overridable via `S3_FORCE_PATH_STYLE` pour les
  fournisseurs qui en ont besoin même avec un endpoint (rare).
- `getSignedUrl()` (`@aws-sdk/s3-request-presigner`) est la seule façon de lire un
  fichier — expiration par défaut de 5 minutes ; aucune fonction n'expose d'URL
  publique directe, aucun bucket rendu public par défaut.
- Service MinIO ajouté à `docker-compose.yml` avec des identifiants de dev fixes
  (`minioadmin`/`minioadmin`) et un volume dédié — même modèle que le service
  `postgres` déjà présent.
- `.env.example` : `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`,
  `S3_SECRET_ACCESS_KEY`, `S3_FORCE_PATH_STYLE`, pré-remplis avec les valeurs du
  MinIO local pour un `docker compose up` + `pnpm dev` sans configuration
  supplémentaire.

Fichiers : `lib/storage.ts`, `docker-compose.yml`, `.env.example`, `package.json`
(+ `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`).

Vérifications effectuées : `npx tsc --noEmit`, `npx eslint`, `npx next build`,
`docker compose config` (syntaxe valide). Le démon Docker n'était pas démarré dans
cet environnement — pas de test fonctionnel MinIO réel (upload/signed URL) effectué ;
à couvrir par `backlog-test` une fois Docker disponible.

## Captures attendues
N/A (fondation backend — voir ITEM-028 pour l'UI). `backlog-test` : avec
`docker compose up -d minio`, vérifier qu'un `uploadFile` + `getSignedUrl` round-trip
fonctionne contre le MinIO local.

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-16 (implement) — démarrage
- 2026-07-16 (implement) — implémenté : client de stockage S3-compatible
  (`uploadFile`/`getSignedUrl`/`deleteFile`), service MinIO en local. Fichiers :
  `lib/storage.ts`, `docker-compose.yml`, `.env.example`, `package.json`.
