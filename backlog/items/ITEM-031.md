---
id: ITEM-031
title: Versionning des documents
status: implemented
priority: P2
type: feature
estimate: M
depends_on: [ITEM-028]
created: 2026-07-16
updated: 2026-07-16
---

## Idée / contexte
Remplacer un document sans historique fait perdre les versions précédentes, ce qui est
risqué pour des documents importants (contrats, rapports).

## User story
En tant qu'utilisateur, je veux conserver l'historique des versions d'un document
remplacé, afin de pouvoir revenir en arrière si besoin.

## Critères d'acceptation
- [x] Uploader un fichier portant le même nom dans le même dossier crée une nouvelle
      `DocumentVersion` plutôt que d'écraser le fichier existant.
- [x] Un panneau « Historique » liste les versions (date, auteur, taille) avec
      possibilité de restaurer une version antérieure.

## Notes techniques
Modèle `DocumentVersion` (documentId, storageKey, versionNumber, createdAt,
createdById) ajouté, conforme aux notes de cadrage.

Décisions :
- **Toute version est tracée, y compris la première.** Le critère ne parle que du
  cas remplacement, mais pour qu'un panneau « Historique » soit utile dès le
  premier upload (et que la restauration ait un ancrage cohérent), chaque
  upload — création ou remplacement — crée une ligne `DocumentVersion`
  (`versionNumber` = 1 à la création, incrémenté ensuite). `Document.storageKey/
  size/mimeType` reste dénormalisé pour pointer vers la version courante, afin
  de ne rien changer aux lectures existantes (liste de documents, prévisualisation
  ITEM-030).
- **Détection de « même document »** : nom égal (insensible à la casse, comme
  la vérification de nom de dossier d'ITEM-029) + même `folderId` + même
  organisation + non supprimé. Aucun champ `deletedAt` sur `DocumentVersion` :
  l'historique suit celui du `Document` parent (cascade `onDelete: Cascade`),
  jamais soft-deleted indépendamment.
- **Restauration = repointage, pas duplication.** `POST
  .../versions/[versionId]/restore` met à jour `Document.storageKey/size/mimeType`
  vers ceux de la version choisie, sans créer de nouvelle ligne
  `DocumentVersion` ni toucher au stockage S3 (aucun fichier supprimé/copié).
  La version « actuelle » est déterminée par comparaison de `storageKey` entre
  `Document` et chaque `DocumentVersion` (`isCurrent`), pas par un champ dédié.
  Choix assumé plutôt que de dupliquer une version à chaque restauration
  (option plus proche d'un historique Git-like) : plus simple, et l'historique
  ne perd jamais rien puisque toutes les versions restent adressables par leur
  propre `storageKey`, jamais réécrit.
- Panneau Historique ouvert depuis le menu contextuel d'un document
  (`DocumentsExplorer.tsx`, à côté de « Déplacer vers la racine » posé par
  ITEM-029) plutôt qu'un bouton dédié dans la liste — cohérent avec le pattern
  déjà en place, pas de nouvelle affordance UI à inventer.
- Restauration sans confirmation (`AlertDialog`) : contrairement à la
  suppression de dossier (ITEM-029), c'est une action non destructive
  (rien n'est perdu, réversible en un clic), donc pas besoin de la friction
  d'une confirmation.

Fichiers : `prisma/schema.prisma` (modèle `DocumentVersion` + relations Document/
User, migration `20260716101658_add_document_version`),
`app/api/documents/upload/route.ts` (création de version), `app/api/documents/[id]/versions/route.ts`,
`app/api/documents/[id]/versions/[versionId]/restore/route.ts`,
`components/documents/VersionHistory.tsx`, `components/documents/DocumentsExplorer.tsx`
(entrée de menu contextuel).

Vérifications effectuées : `npx tsc --noEmit`, `npx eslint` (ciblé), `npx next
build`, migration appliquée sur la base de dev locale (`npx prisma migrate dev`),
`curl` sur les deux nouvelles routes (serveur de dev déjà lancé) confirmant un
`401` propre. Pas de vérification fonctionnelle authentifiée (upload répété du
même nom, restauration réelle) — à couvrir par `backlog-test`.

## Captures attendues
Panneau d'historique avec plusieurs versions (date, taille, auteur), badge
« Actuelle » sur la version active, restauration d'une version antérieure
réussie (le document redevient celui restauré, visible en prévisualisation
ITEM-030).

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-16 (implement) — démarrage
- 2026-07-16 (implement) — implémenté : modèle `DocumentVersion`, création
  automatique d'une version à chaque upload (première version comprise),
  panneau Historique avec restauration (repointage, sans duplication).
  Fichiers : `prisma/schema.prisma`, `prisma/migrations/20260716101658_add_document_version/`,
  `app/api/documents/upload/route.ts`, `app/api/documents/[id]/versions/route.ts`,
  `app/api/documents/[id]/versions/[versionId]/restore/route.ts`,
  `components/documents/VersionHistory.tsx`, `components/documents/DocumentsExplorer.tsx`.
