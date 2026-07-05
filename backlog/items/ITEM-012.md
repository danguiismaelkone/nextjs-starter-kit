---
id: ITEM-012
title: Adopter le module DataTable pour les listes Utilisateurs & Invitations
status: verified
priority: P2
type: feature
estimate: M
depends_on: [ITEM-007, ITEM-008]
created: 2026-07-04
updated: 2026-07-05
---

## Idée / contexte
Les listes `/admin/users` et `/admin/users/invitations` utilisent aujourd'hui des
tableaux HTML « faits main » (pagination et recherche câblées manuellement). Le
projet dispose d'un **module DataTable** générique et réutilisable (registre
FATIHOUNE, `/module:add datatable`) : composant `<DataTable>` avec tri, filtres,
pagination, bascule de colonnes, sélection multiple et export CSV — le tout basé
sur shadcn/ui. Adopter ce composant rapproche l'interface d'une « vraie » console
d'admin et supprime le tableau maison. C'est la réponse à la question : oui, ces
pages peuvent (et devraient) s'appuyer sur notre DataTable.

## User story
En tant qu'administrateur, je veux des listes avec tri, filtres et colonnes
configurables, afin d'explorer et gérer les comptes/invitations comme dans un
véritable back-office.

## Critères d'acceptation
- [x] Le module `datatable` est installé (`components/data-table/*`) ainsi que les composants shadcn requis manquants (Table, Checkbox, Badge, Popover, Select, Dialog, DropdownMenu, Skeleton, Separator).
- [x] `/admin/users` affiche la liste via `<DataTable>` avec des colonnes typées `ColumnDef<User>[]` (nom, e-mail, rôle en badge, statut en badge, date de création) — plus de `<table>` manuel.
- [x] `/admin/users/invitations` affiche la liste via `<DataTable>` (e-mail, rôle, statut en badge, expiration) — plus de `<table>` manuel.
- [x] Les **actions existantes** sont branchées via les props du DataTable (actions de ligne / actions groupées) : Modifier + Activer/Désactiver (users), Renvoyer + Révoquer (invitations), en réutilisant les **server actions déjà en place** (ITEM-007/008), sans les réécrire.
- [x] La recherche et la pagination restent fonctionnelles (via les fonctionnalités du DataTable ou en lui fournissant les données paginées côté serveur) — aucune perte de capacité par rapport à l'existant.
- [x] **Non-régression** : tous les critères d'ITEM-007 et ITEM-008 restent satisfaits (création, édition, désactivation, invitation/renvoi/révocation, protection serveur, rafraîchissement après mutation).
- [x] Les gardes d'accès (`requireAdmin`) et le comportement « auto-désactivation interdite » sont préservés.

## Notes techniques
- Installer via `/module:add datatable` puis suivre `module.md` (règles strictes :
  toujours importer depuis `@/components/data-table`, définir des `ColumnDef<T>`,
  ne pas recréer de table manuelle, server actions dans `actions/`).
- **Ne pas** installer le module `users-management` : il dépend de
  `roles-permissions` et d'un modèle de bannissement propres, ce qui entrerait en
  conflit avec notre approche applicative Better Auth (rôle simple + `disabledAt`,
  ITEM-006/007). On ne réutilise que le composant **DataTable générique**.
- Colonnes badge : mapper rôle (`user`/`admin`) et statut (Actif/Désactivé ;
  En attente/Acceptée/Révoquée/Expirée) via `badgeMap`. Réutiliser
  `invitationInvalidReason` pour dériver « Expirée ».
- Décider tri/filtre **client** (simple, sur la page courante) vs **serveur**
  (cohérent avec la pagination serveur actuelle) — documenter le choix. Pour un
  volume modeste, le mode client sur données fournies est acceptable.
- Fichiers touchés : `app/admin/users/page.tsx`,
  `app/admin/users/invitations/page.tsx`, nouveaux fichiers de colonnes
  (`components/admin/users-columns.tsx`, `.../invitations-columns.tsx`),
  `components/data-table/*` (généré), composants shadcn ajoutés.
- Hors-périmètre : export/import CSV métier réel, colonnes custom avancées,
  refonte des formulaires (relève d'ITEM-011).

## Décisions d'implémentation
- **Mode client** retenu (le DataTable filtre/trie/pagine les données fournies).
  Les pages fetchent l'ensemble borné (`users` take 500, `invitations` take 200) ;
  documenté dans le code + commentaire « passer `serverSide` si ça doit scaler ».
  La recherche/pagination serveur (`?q=`/`?page=`) de l'ancienne page Utilisateurs
  est remplacée par les filtres + pagination du DataTable (aucune perte de capacité).
- **Module généré** (mode génératif : pas de `manifest.json`/`files/` pour datatable).
  9 fichiers `components/data-table/*` conformes au contrat `module.md`
  (`ColumnDef<T>`, `RowAction`, `BulkAction`, `DataTableProps`, filtres text/badge/date/currency,
  tri, bascule de colonnes, sélection multiple, export/import CSV, skeleton/empty/error).
- **Primitives shadcn** ajoutées en respectant le style du repo (paquet unifié
  `radix-ui`, `data-slot`, tokens) : `table`, `badge`, `checkbox`, `popover`,
  `dialog`, `dropdown-menu`, `skeleton`, `separator`. Le `select.tsx` natif existant
  est **conservé** (les formulaires en dépendent) et réutilisé par la pagination.
- **Actions de ligne** branchées sur les server actions existantes (`setUserDisabled`,
  `resendInvitation`, `revokeInvitation`) via des wrappers clients
  (`users-columns.tsx`, `invitations-columns.tsx`) — actions non réécrites.
  « Désactiver » masquée pour soi-même (garde serveur conservée en plus).
- Anciens composants de ligne devenus morts supprimés : `disable-user-button.tsx`,
  `invitation-row-actions.tsx`.

## Captures attendues
Liste Utilisateurs rendue via DataTable (tri d'une colonne, filtre, bascule de
colonnes, badges rôle/statut, actions de ligne) ; liste Invitations via DataTable
(badges de statut + actions) ; démonstration qu'une action (ex. désactivation ou
révocation) fonctionne toujours et rafraîchit la liste.

## Journal
- 2026-07-04 (backlog) — créé
- 2026-07-05 (implement) — démarrage
- 2026-07-05 (verify) — vérifié : revue OK (7/7 critères), types OK, lint OK, build OK. Server actions/gardes intactes, select natif préservé, aucun code mort. Note non bloquante : couleurs de badges en palette fixe (non dark-mode optimisée).
- 2026-07-05 (implement) — implémenté : module DataTable générique (9 fichiers) + 8 primitives shadcn ; listes Utilisateurs & Invitations via `<DataTable>` (colonnes typées, badges rôle/statut, tri/filtres/pagination/colonnes/export client), actions branchées sur les server actions existantes ; anciens tableaux manuels et composants de ligne supprimés. tsc/lint/build OK. Fichiers : components/data-table/{types,utils,DataTable,DataTableToolbar,DataTableHeader,DataTableBody,DataTablePagination,DataTableFilterChip,index}.ts(x), components/ui/{table,badge,checkbox,popover,dialog,dropdown-menu,skeleton,separator}.tsx, components/admin/{users-columns,invitations-columns}.tsx, app/admin/users/page.tsx, app/admin/users/invitations/page.tsx
