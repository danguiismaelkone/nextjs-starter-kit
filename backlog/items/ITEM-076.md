---
id: ITEM-076
title: DataTable enrichi — tri, filtres, sélection, actions groupées, export/import, colonnes
status: implemented
priority: P2
type: feature
estimate: L
depends_on: [ITEM-061]
created: 2026-07-18
updated: 2026-07-18
---

## Idée / contexte
Capture d'écran de référence fournie par l'utilisateur (page « Catalogue de
produits » d'un SaaS tiers) : toutes les pages CRUD de ce projet doivent converger
vers un gabarit commun (voir ITEM-077 pour le gabarit de page ; cet item couvre la
brique DataTable elle-même).

`components/data-table/DataTable.tsx` existe déjà (module FATIHOUNE `datatable`,
ITEM-061) mais a été **volontairement limité à la pagination** à l'époque
(« Pas de tri/filtrage/sélection de colonnes intégré — au-delà du périmètre "S" de
cet item », note technique d'ITEM-061). Cet item complète ce composant jusqu'aux
capacités attendues d'une vraie table CRUD SaaS : tri, filtres par colonne,
sélection multiple + actions groupées, export/import CSV, colonnes
masquables/réordonnables, et première colonne fixe quand les colonnes dépassent la
largeur visible.

## User story
En tant que développeur de ce projet, je veux un composant `DataTable` complet et
configurable, afin que chaque nouvelle page CRUD s'appuie sur la même brique plutôt
que de réinventer tri/filtres/sélection à chaque fois.

## Critères d'acceptation
- [x] Colonnes triables (ascendant/descendant) quand déclarées `sortable`, tri
      appliqué côté serveur (cohérent avec la pagination déjà côté serveur).
- [x] Filtres par colonne (chips, façon capture de référence : « Date de création »,
      « État » cliquables) qui mettent à jour les résultats affichés.
- [x] Sélection multiple de lignes (case à cocher par ligne + « tout sélectionner »)
      et au moins une action groupée exécutable sur la sélection.
- [x] Export CSV des données affichées (respecte les filtres actifs) et import CSV
      (au moins un cas d'usage réel du projet branché, pas un simple stub).
- [x] Un contrôle « Modifier les colonnes » permettant de masquer/afficher des
      colonnes, état persisté au moins pour la session en cours.
- [x] Quand l'ensemble des colonnes dépasse la largeur visible (défilement
      horizontal), la première colonne reste fixe (sticky) pendant le défilement.
- [x] Le composant reste utilisable avec une configuration minimale (colonnes +
      données seulement) — les fonctionnalités ci-dessus sont opt-in par colonne/prop,
      pas une refonte qui casserait un usage simple.
- [x] Au moins un consommateur existant (`/admin/users` recommandé, cf. ITEM-078)
      migré vers la version enrichie pour prouver la compatibilité — les deux autres
      consommateurs actuels (`/billing/invoices`, `/settings/audit`) continuent de
      fonctionner sans régression (migration complète hors périmètre de cet item).

## Notes techniques
Module FATIHOUNE `datatable` (`~/.claude/modules/datatable/nextjs/module.md`) :
**déjà partiellement adopté** dans ce repo (`components/data-table/DataTable.tsx`,
ITEM-061) — ne pas réinstaller par-dessus (`/module:add datatable` écraserait le
travail déjà livré), mais **compléter l'existant** en s'inspirant de la structure
documentée par le module (`DataTableToolbar`, `DataTableHeader`, `DataTableBody`,
`DataTablePagination`, `DataTableFilterChip`, `types.ts`, `utils.ts`) pour rester
compatible avec ce que d'autres projets FATIHOUNE utilisant ce module attendraient.

Le module `crud` (dépendant de `datatable`) va bien au-delà de cet item (FormBuilder,
EntityDetailPage générique) — **volontairement écarté** : ce repo a déjà sa propre
convention de formulaires (Server Actions + `useActionState`, utilisée par toutes
les pages de ce projet jusqu'ici) ; adopter `FormBuilder` introduirait une seconde
convention concurrente. Seule la partie liste/DataTable du module `crud` (diagramme
« Structure de la page liste ») sert de référence, pas le reste.

Tri/filtres côté serveur : chaque page consommatrice lie déjà sa Server Action
`fetchPage` à ses propres filtres (`.bind(null, organizationId, ...)`, ITEM-061) — le
tri/filtrage ajoutés doivent suivre le même principe (paramètres supplémentaires liés
à la Server Action), pas une nouvelle couche de fetching parallèle.

Import CSV : le format/mapping de colonnes doit être défini pour un cas réel
existant du projet (ex. import d'invitations en masse, ou d'utilisateurs) — à choisir
à l'implémentation en fonction de ce qui a le plus de valeur, mais pas un import
générique sans consommateur réel (invérifiable sinon).

Fichiers attendus : `components/data-table/*` (étendu, fichiers séparés par
responsabilité plutôt qu'un unique gros fichier), au moins une page migrée pour la
preuve de compatibilité.

Décisions à l'implémentation :
- **API rétrocompatible par construction** : `DataTableProps.fetchPage` passe de
  `(page: number) => Promise<...>` à `(page: number, context?: DataTableFetchContext)
  => Promise<...>` — TypeScript autorise une fonction à MOINS de paramètres à
  satisfaire un type qui en attend plus (paramètres surnuméraires simplement
  ignorés), donc les Server Actions liées existantes
  (`getInvoicesPageAction.bind(...)`, `getAuditPageAction.bind(...)`, un seul
  paramètre `page`) continuent de typechecker et de fonctionner à l'exécution sans
  modification — vérifié par `tsc --noEmit` sans aucune erreur sur
  `TransactionTable.tsx`/`AuditDataTable.tsx`, non touchés par cet item.
- **Fichiers séparés par responsabilité** (`components/data-table/`) : `types.ts`
  (types partagés), `csv.ts` (export/parsing, sans dépendance, mêmes principes que
  l'export CSV déjà écrit à la main pour le journal d'audit, ITEM-067),
  `DataTableFilterChip.tsx`, `DataTableToolbar.tsx`, `DataTablePagination.tsx`,
  `DataTable.tsx` (orchestrateur), `index.ts` (barrel) — reprend la structure
  documentée par le module FATIHOUNE `datatable` sans forcer les fichiers qui
  n'apportaient rien ici (pas de `DataTableHeader.tsx`/`DataTableBody.tsx` séparés,
  le tri/la sélection restent dans l'orchestrateur, suffisamment courts).
- **Nouveau `components/ui/popover.tsx`** : le filtre par chip (façon capture de
  référence) a besoin d'un Popover — absent du repo avant cet item, mais `radix-ui`
  (déjà une dépendance) exporte `Popover` (`@radix-ui/react-popover` réexporté) :
  wrapper écrit à la main dans le même style que `dropdown-menu.tsx`/`dialog.tsx`
  existants, pas une nouvelle dépendance npm.
- **Filtres limités à `text`/`select`** (pas de plage de dates comme la capture de
  référence le suggère pour « Date de création ») — simplification volontaire pour
  garder l'item dans un périmètre L raisonnable ; un type `dateRange` serait une
  extension naturelle mais non demandée explicitement par les critères.
- **Sélection réinitialisée à chaque changement de page/tri/filtre** : une ligne
  sélectionnée peut ne plus être affichée après un rechargement des données, la
  sélection ne doit donc pas survivre silencieusement à un contexte différent.
- **Migration de référence : `/admin/users`** (`app/(protected)/admin/users/
  {actions.ts,UsersDataTable.tsx}`) — tri sur nom/e-mail/date de création (`orderBy`
  Prisma), filtres rôle/statut (`where` Prisma), sélection + actions groupées
  « Désactiver »/« Réactiver » (nouvelle `bulkSetUsersDisabledAction`, mêmes garde-fous
  que `setUserDisabledAction` — jamais soi-même, jamais un autre organisation),
  export CSV des utilisateurs affichés, import CSV (nouvelle `importUsersAction`,
  **mêmes champs que la création unique déjà existante** — nom/e-mail/mot de
  passe/rôle, `createUserSchema` réutilisé tel quel ligne par ligne — pas un nouveau
  mécanisme de provisioning, le même accepté par ce projet pour la création
  unique) — 1 échec de ligne n'interrompt pas les suivantes, remonté dans le
  résumé. Première colonne fixe activée (`stickyFirstColumn`) pour démontrer le
  critère.
- **`/billing/invoices`/`/settings/audit` non touchés** — migration complète
  explicitement hors périmètre (ITEM-076 ne demande qu'« au moins un » consommateur).

Vérifications effectuées : `npx tsc --noEmit`, `npx eslint .` (aucune erreur — le
seul avertissement du repo est préexistant, sans rapport), `npx vitest run` (68
tests — 60 existants inchangés + 8 nouveaux sur `csv.ts`, parsing/échappement CSV).
`npx next build` OK (`/admin/users` et les 2 autres routes DataTable listées, aucune
route perdue). Testé en conditions réelles via `next build` + `next start` sur un
port séparé (arrêté après coup, dev server existant non touché) : `/admin/users`
(200) affiche bien les chips de filtre (Rôle/Statut), les boutons Exporter/
Importer/Modifier les colonnes, les cases à cocher de sélection (en-tête + lignes),
et la classe CSS `sticky` sur la première colonne ; `/billing/invoices` et
`/settings/audit` (non migrés) répondent toujours 200 sans régression. Les
interactions elles-mêmes (clic de tri, popover de filtre, téléchargement d'export,
dialog d'import, exécution d'une action groupée) nécessitent un navigateur réel —
non vérifiées par requêtes HTTP statiques, à confirmer par `backlog-test`.

## Captures attendues
Table `/admin/users` avec colonnes triées, filtres actifs (chips Rôle/Statut),
lignes sélectionnées + action groupée « Désactiver »/« Réactiver » exécutée, export
CSV téléchargé, import CSV réussi (et un cas d'échec partiel affiché), colonnes
masquées via « Modifier les colonnes », défilement horizontal avec première colonne
fixe. `/billing/invoices` et `/settings/audit` inchangés (preuve de non-régression).

## Journal
- 2026-07-18 (backlog) — créé à partir d'une capture d'écran demandant un gabarit de
  page CRUD commun (header, onglets, cartes de stats filtrables, DataTable riche).
  Scindé en 3 items (ce composant DataTable, le gabarit de page ITEM-077, et la
  migration de référence ITEM-078) pour rester sur des tailles S/M/L plutôt qu'un
  seul item XL touchant toute l'application.
- 2026-07-18 (implement) — démarrage
- 2026-07-18 (implement) — implémenté : `components/data-table/` étendu (tri,
  filtres par colonne, sélection + actions groupées, export/import CSV, colonnes
  masquables, première colonne fixe), nouveau `components/ui/popover.tsx`,
  `/admin/users` migré comme page de référence (tri nom/e-mail/date, filtres rôle/
  statut, bulk désactiver/réactiver, export/import CSV réels). `/billing/invoices`
  et `/settings/audit` non modifiés, vérifiés sans régression. Fichiers listés en
  Notes techniques.
