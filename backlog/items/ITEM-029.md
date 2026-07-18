---
id: ITEM-029
title: Arborescence de dossiers et navigation
status: implemented
priority: P1
type: feature
estimate: M
depends_on: [ITEM-028]
created: 2026-07-16
updated: 2026-07-16
---

## Idée / contexte
Au-delà de l'upload brut (ITEM-028), les utilisateurs ont besoin d'organiser leurs
documents en dossiers pour s'y retrouver.

## User story
En tant qu'utilisateur, je veux organiser mes documents dans des dossiers, afin de les
retrouver facilement.

## Critères d'acceptation
- [x] Page `/documents` affiche l'arborescence de dossiers de l'organisation active avec
      fil d'ariane (breadcrumb).
- [x] Création, renommage et suppression de dossier (déplace son contenu en corbeille,
      voir ITEM-032).
- [x] Déplacement d'un document ou dossier par glisser-déposer ou menu contextuel.

## Notes techniques
Pas de couverture FATIHOUNE directe au-delà du composant `FileList.tsx` du module
`upload` (confirmé à l'implémentation : `nextjs/module.md` du module `upload` ne
fournit qu'upload/preview/liste, aucune spec d'arborescence — développement
spécifique).

Décisions :
- **Navigation par route dynamique** plutôt que query param : `/documents` (racine)
  et `/documents/[folderId]` (dossier courant), chacune Server Component qui
  résout le dossier (`lib/documents.ts#resolveFolder`, `notFound()` si hors
  organisation/supprimé) et calcule le fil d'ariane en remontant `parentId`
  (`getFolderPath`). Les deux pages délèguent tout le rendu interactif à
  `components/documents/DocumentsExplorer.tsx` (client) pour éviter la
  duplication.
- **Suppression de dossier = fondation de la corbeille, pas la corbeille
  elle-même.** Le critère « déplace son contenu en corbeille, voir ITEM-032 »
  dépend d'un mécanisme que ITEM-032 n'a pas encore livré (page Corbeille,
  restauration, purge planifiée — toujours `todo`). Plutôt que d'inventer cette
  UI hors périmètre ou de faire une suppression définitive incompatible avec
  ITEM-032, ITEM-029 ajoute le champ `deletedAt` sur `Folder` **et** `Document`
  (`prisma/migrations/20260716100639_add_folder_document_soft_delete`) et
  l'utilise pour une suppression douce récursive
  (`lib/documents.ts#softDeleteFolderTree` : dossier + tous ses sous-dossiers +
  tous les documents qu'ils contiennent, en transaction). Toutes les requêtes de
  lecture (arborescence, upload, résolution de dossier) filtrent déjà
  `deletedAt: null`. Il ne reste à ITEM-032 que la couche produit : page
  `/documents/trash`, action Restaurer, purge après délai — le champ et son
  usage en cascade n'ont pas à être refaits.
- **Déplacement (glisser-déposer + menu contextuel)** : glisser-déposer HTML5
  natif (pas de librairie DnD) sur les lignes dossier/document (source) et sur
  les lignes dossier + le fil d'ariane (cibles, y compris « Documents » =
  racine). Le menu contextuel (clic droit, `components/ui/context-menu.tsx`
  ajouté via `npx shadcn add context-menu`) complète avec une action rapide
  « Déplacer vers la racine » — le critère demande l'un OU l'autre mécanisme, le
  glisser-déposer couvre déjà toute destination arbitraire.
- Protection anti-cycle côté serveur (`lib/documents.ts#wouldCreateCycle`) :
  impossible de déplacer un dossier dans lui-même ou l'un de ses descendants
  (409/400 explicite), jamais laissé à la seule UI.
- Noms de dossier : unicité vérifiée en base par requête (`mode: "insensitive"`)
  au sein d'un même parent, pas de contrainte `@@unique` (les `NULL` de
  `parentId` ne se comparent pas entre eux en Postgres — une contrainte DB
  laisserait passer des doublons à la racine).
- Toute mutation (créer/renommer/déplacer/supprimer un dossier, déplacer un
  document) passe par une route handler (`app/api/folders/route.ts`,
  `app/api/folders/[id]/route.ts`, `app/api/documents/[id]/route.ts`) suivant la
  convention déjà posée par ITEM-028 (mutation dans la route, pas de fichier
  `actions.ts` séparé pour ce module), ouverte à tout membre actif de
  l'organisation (pas réservé aux admins, cohérent avec `upload/route.ts`).
- `components/ui/breadcrumb.tsx` ajouté via `npx shadcn add breadcrumb` (déjà
  configuré dans `components.json`), pas de composant fil d'ariane maison.

Fichiers : `prisma/schema.prisma` (+ migration
`20260716100639_add_folder_document_soft_delete`), `lib/documents.ts`,
`app/api/folders/route.ts`, `app/api/folders/[id]/route.ts`,
`app/api/documents/[id]/route.ts`, `app/api/documents/upload/route.ts` (filtre
`deletedAt`), `app/(protected)/documents/page.tsx`,
`app/(protected)/documents/[folderId]/page.tsx`,
`components/documents/DocumentsExplorer.tsx`,
`components/documents/FolderDialog.tsx`, `components/ui/breadcrumb.tsx`,
`components/ui/context-menu.tsx`.

Vérifications effectuées : `npx tsc --noEmit`, `npx eslint` (ciblé sur les
fichiers touchés), `npx next build`, migration appliquée sur la base de dev
locale (`npx prisma migrate dev`). Requête `curl /documents` sur le serveur de
dev déjà lancé par l'utilisateur : redirige bien vers `/login` (pas d'erreur
serveur), mais pas de vérification fonctionnelle authentifiée (drag & drop,
dialogs, breadcrumb réels) — à couvrir par `backlog-test`.

## Captures attendues
Arborescence avec plusieurs niveaux de dossiers, breadcrumb de navigation,
création/renommage/suppression de dossier, déplacement d'un document réussi (par
glisser-déposer et par menu contextuel).

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-16 (implement) — démarrage
- 2026-07-16 (implement) — implémenté : navigation `/documents` +
  `/documents/[folderId]` avec fil d'ariane, création/renommage/suppression
  (douce) de dossier, déplacement de dossiers/documents par glisser-déposer et
  menu contextuel. Champ `deletedAt` ajouté sur `Folder`/`Document` en fondation
  de la corbeille (ITEM-032). Fichiers : `prisma/schema.prisma`,
  `prisma/migrations/20260716100639_add_folder_document_soft_delete/`,
  `lib/documents.ts`, `app/api/folders/route.ts`,
  `app/api/folders/[id]/route.ts`, `app/api/documents/[id]/route.ts`,
  `app/(protected)/documents/page.tsx`,
  `app/(protected)/documents/[folderId]/page.tsx`,
  `components/documents/DocumentsExplorer.tsx`,
  `components/documents/FolderDialog.tsx`.
