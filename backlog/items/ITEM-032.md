---
id: ITEM-032
title: Corbeille (suppression douce + restauration)
status: implemented
priority: P2
type: feature
estimate: M
depends_on: [ITEM-028]
created: 2026-07-16
updated: 2026-07-16
---

## Idée / contexte
Une suppression définitive immédiate est risquée pour l'utilisateur. Une corbeille
donne un filet de sécurité, comme sur tout système de fichiers moderne.

## User story
En tant qu'utilisateur, je veux pouvoir restaurer un document supprimé par erreur, afin
de ne pas perdre de données importantes.

## Critères d'acceptation
- [x] Supprimer un document/dossier le marque `deletedAt` (soft delete) au lieu de le
      supprimer immédiatement du stockage. *(cascade dossier livrée par ITEM-029 ;
      suppression douce d'un document isolé ajoutée par cet item.)*
- [x] Page « Corbeille » liste les éléments supprimés avec actions Restaurer /
      Supprimer définitivement.
- [x] Une tâche planifiée (ou job manuel) purge définitivement les éléments après un
      délai configurable (ex. 30 jours).

## Notes techniques
ITEM-029 (arborescence de dossiers) avait anticipé la fondation de cet item : le champ
`deletedAt` existait déjà sur `Folder` et `Document`
(`prisma/migrations/20260716100639_add_folder_document_soft_delete`), toutes les
requêtes de lecture du module Documents le filtraient déjà (`deletedAt: null`), et la
suppression d'un dossier (`DELETE /api/folders/[id]`) l'utilisait déjà en cascade sur
son contenu (`lib/documents.ts#softDeleteFolderTree`). Cet item construit dessus :
suppression douce d'un document isolé, restauration, page Corbeille, purge définitive.

Décisions :
- **Restauration = double cascade.** Restaurer un dossier redonne vie à *tout* son
  sous-arbre (sous-dossiers + documents, symétrique de la suppression — sinon un
  dossier restauré apparaîtrait vide, son contenu restant caché) **et** à ses
  ancêtres supprimés (sinon le dossier redevient « vivant » mais injoignable
  depuis la racine). Restaurer un document isolé restaure de la même façon la
  chaîne d'ancêtres de son dossier si elle était supprimée.
  `collectDescendantFolderIds` (déjà utilisée par la suppression) a été
  généralisée pour ignorer `deletedAt` : elle sert désormais aux deux
  directions (tout mettre à `now`, ou tout remettre à `null`).
- **Corbeille = niveau le plus haut de chaque sous-arbre supprimé**
  (`listTrash`) : si un dossier et son contenu ont été supprimés ensemble, seul
  le dossier apparaît dans la liste (son contenu est implicite, restauré/purgé
  avec lui) — évite une corbeille encombrée de dizaines de lignes pour un seul
  geste de suppression, cohérent avec Drive/Dropbox.
- **Purge définitive = DB + S3, jamais partielle.** `purgeDocument`/`purgeFolder`
  suppriment aussi les objets S3 de **toutes** les versions (ITEM-031), pas
  seulement la version courante — sinon d'anciennes versions resteraient
  orphelines dans le bucket indéfiniment. Un échec de suppression S3 (bucket
  injoignable, objet déjà absent) est journalisé (`console.error`,
  `TODO(ITEM-062)`) mais ne bloque jamais la suppression des lignes en base :
  mieux vaut un objet orphelin exceptionnel qu'une corbeille qui ne se vide
  plus. `Folder.documents` étant en `onDelete: SetNull` (ITEM-028, un document
  survit à son dossier), `purgeFolder` supprime explicitement les documents
  avant les dossiers — sinon `prisma.folder.deleteMany` les orphelinerait à la
  racine au lieu de les purger.
- **« Job manuel » plutôt que « tâche planifiée ».** Ce repo n'a pas
  d'infrastructure de cron/scheduler à ce stade (à voir avec ITEM-064/
  déploiement) ; le critère autorise explicitement l'un ou l'autre. Ajouté :
  `scripts/purge-trash.ts` (`pnpm trash:purge [jours]`), même convention que
  `prisma/seed.ts` (imports relatifs, exécuté via `tsx`), réutilisant
  `lib/documents.ts#purgeExpiredTrash`. Peut être branché sur un cron externe
  (ex. tâche planifiée du déploiement, hors périmètre ici) sans changement de
  code. Délai configurable via `TRASH_RETENTION_DAYS` (`.env.example`, défaut
  30 jours, même convention que `TRIAL_PERIOD_DAYS`).
- Suppression douce d'un document isolé (`DELETE /api/documents/[id]`)
  accessible depuis le menu contextuel de `DocumentsExplorer.tsx`
  (« Supprimer », à côté des entrées posées par ITEM-029/031), avec
  confirmation `AlertDialog` cohérente avec celle déjà en place pour les
  dossiers.
- Restauration **sans** confirmation (non destructive, réversible), suppression
  **définitive** **avec** confirmation `AlertDialog` explicite (irréversible,
  y compris le stockage) — même logique de friction proportionnée qu'ITEM-031.
- Lien « Corbeille » ajouté dans la barre d'outils de `DocumentsExplorer.tsx`
  (à côté de « Nouveau dossier ») : sans lui, `/documents/trash` ne serait
  atteignable qu'en tapant l'URL.

Fichiers : `lib/documents.ts` (`softDeleteDocument`, `listTrash`,
`restoreFolderChain`, `restoreFolderTree`, `restoreDocument`, `purgeDocument`,
`purgeFolder`, `purgeExpiredTrash`, `TRASH_RETENTION_DAYS`),
`app/api/documents/[id]/route.ts` (`DELETE`),
`app/api/documents/[id]/restore/route.ts`, `app/api/documents/[id]/purge/route.ts`,
`app/api/folders/[id]/restore/route.ts`, `app/api/folders/[id]/purge/route.ts`,
`app/(protected)/documents/trash/page.tsx`, `components/documents/TrashView.tsx`,
`components/documents/DocumentsExplorer.tsx` (action Supprimer + lien Corbeille),
`scripts/purge-trash.ts`, `package.json` (`trash:purge`), `.env.example`
(`TRASH_RETENTION_DAYS`).

Vérifications effectuées : `npx tsc --noEmit`, `npx eslint` (ciblé), `npx next
build`, `pnpm trash:purge` exécuté réellement contre la base de dev locale
(0 élément purgé, comportement attendu à vide), `curl` sur toutes les nouvelles
routes et sur `/documents/trash` (serveur de dev déjà lancé) confirmant des
réponses propres (401/redirection login, pas d'erreur serveur). Pas de
vérification fonctionnelle authentifiée (suppression réelle, apparition en
corbeille, restauration, purge manuelle depuis l'UI) — à couvrir par
`backlog-test`.

## Captures attendues
Document et dossier supprimés apparaissant dans la corbeille ; restauration
réussie (élément et son contenu redeviennent visibles dans `/documents`) ;
suppression définitive avec confirmation, élément retiré de la corbeille.

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-16 (implement, depuis ITEM-029) — `deletedAt` (Folder/Document) et la
  cascade de suppression douce livrés en avance par ITEM-029 ; premier critère
  coché, notes mises à jour pour éviter de refaire ce travail à
  l'implémentation de cet item.
- 2026-07-16 (implement) — démarrage
- 2026-07-16 (implement) — implémenté : suppression douce d'un document isolé,
  page Corbeille (liste niveau supérieur, Restaurer/Supprimer définitivement),
  restauration en double cascade (contenu + ancêtres), purge définitive DB+S3
  (toutes versions incluses) via script manuel `pnpm trash:purge`
  (rétention configurable `TRASH_RETENTION_DAYS`). Fichiers : `lib/documents.ts`,
  `app/api/documents/[id]/route.ts`, `app/api/documents/[id]/restore/route.ts`,
  `app/api/documents/[id]/purge/route.ts`, `app/api/folders/[id]/restore/route.ts`,
  `app/api/folders/[id]/purge/route.ts`, `app/(protected)/documents/trash/page.tsx`,
  `components/documents/TrashView.tsx`, `components/documents/DocumentsExplorer.tsx`,
  `scripts/purge-trash.ts`.
