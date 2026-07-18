---
id: ITEM-028
title: Modèle Document/Folder + upload de fichiers
status: implemented
priority: P1
type: feature
estimate: M
depends_on: [ITEM-027]
created: 2026-07-16
updated: 2026-07-16
---

## Idée / contexte
Une fois le client de stockage prêt (ITEM-027), il faut modéliser les documents et
dossiers en base et offrir une UI d'upload de base.

## User story
En tant qu'utilisateur, je veux uploader un fichier dans mon organisation, afin de le
stocker et le retrouver plus tard.

## Critères d'acceptation
- [x] Modèles Prisma `Document` (name, size, mimeType, storageKey, folderId,
      organizationId, uploadedById) et `Folder` (name, parentId, organizationId).
- [x] `FileUpload.tsx` (drag & drop, preview, barre de progression) permet d'uploader un
      ou plusieurs fichiers dans le dossier courant.
- [x] Validation type/taille de fichier côté client ET serveur (pas de confiance au seul
      contrôle client).

## Notes techniques
Écarts assumés par rapport au module `upload` de référence :
- **Route Handler plutôt que Server Action** (`app/api/documents/upload/route.ts` au
  lieu de `actions/upload.ts`) : une vraie barre de progression d'envoi nécessite
  `XMLHttpRequest`/`upload.onprogress`, inatteignable via le protocole d'appel des
  Server Actions. Le module lui-même recommande cette bascule « pour de gros
  fichiers, préférer un upload direct... qui contourne les Server Actions » — les
  documents (jusqu'à 20 Mo) sont dans ce cas. Contourne aussi la limite par défaut de
  1 Mo des Server Actions (et la config `next.config.ts` que le module demande en
  conséquence — inutile ici).
- `hooks/use-upload.ts` (kebab-case, pas `useUpload.ts`) pour matcher la convention
  déjà en place dans `hooks/use-mobile.ts`.
- Pas de fichier `actions/upload.ts` séparé au niveau racine : ce repo colocalise les
  actions par route (`app/(protected)/.../actions.ts`) ; ici la mutation vit dans la
  route handler elle-même, pas dans un fichier d'actions partagé.
- `uploadedById` et `folderId` sont nullables dans le schéma (`onDelete: SetNull`) :
  le document survit à la suppression de son auteur ou de son dossier — cohérent
  avec la contrainte « pas de suppression de données » vue ailleurs dans ce backlog
  (ITEM-024/026).
- Clé de stockage S3 = `organizations/{orgId}/documents/{uuid}{extension}` — jamais
  le nom de fichier original dans la clé (sécurité). L'extension extraite du nom
  original est filtrée par regex (`[a-zA-Z0-9]{1,10}`) avant d'être réutilisée, pour
  ne jamais injecter de segments de chemin (`../`) contrôlés par l'utilisateur dans
  la clé S3.
- Types acceptés (`image/jpeg`, `image/png`, `image/webp`, `application/pdf`) et
  taille max (20 Mo) repris de `_shared/upload.spec.json` / guidance backend du
  module (« documents = 20MB »), synchronisés entre `FileUpload.tsx` (validation
  client, UX immédiate) et la route (validation serveur, seule qui fait foi).
- Page `app/(protected)/documents/page.tsx` ajoutée (non listée dans les notes
  techniques d'origine) pour héberger `FileUpload` et rendre le critère « fichier
  visible ensuite dans la liste » vérifiable — sans navigation de dossiers
  (périmètre d'ITEM-029) : liste uniquement les documents à la racine
  (`folderId: null`), accessible à tout membre actif de l'organisation (pas
  réservé aux admins, cohérent avec la user story « en tant qu'utilisateur »).

Fichiers : `prisma/schema.prisma` (+ migration `add_document_folder`),
`app/api/documents/upload/route.ts`, `hooks/use-upload.ts`,
`components/upload/FileUpload.tsx`, `app/(protected)/documents/page.tsx`,
`package.json` (+ `react-dropzone`).

## Captures attendues
Zone de drag & drop, upload d'un fichier avec preview (miniature pour les images) et
barre de progression, fichier visible ensuite dans la liste sur `/documents`.

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-16 (implement) — démarrage
- 2026-07-16 (implement) — implémenté : modèles `Document`/`Folder`, upload drag & drop
  avec preview et progression réelle (route handler + XHR), validation double
  client/serveur, page `/documents`. Fichiers : `prisma/schema.prisma`,
  `prisma/migrations/20260716094043_add_document_folder/`,
  `app/api/documents/upload/route.ts`, `hooks/use-upload.ts`,
  `components/upload/FileUpload.tsx`, `app/(protected)/documents/page.tsx`.
