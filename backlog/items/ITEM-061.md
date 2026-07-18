---
id: ITEM-061
title: Pagination et lazy loading des listes
status: implemented
priority: P2
type: feature
estimate: S
depends_on: []
created: 2026-07-16
updated: 2026-07-16
---

## Idée / contexte
Plusieurs listes du SaaS Core (utilisateurs, documents, factures, journal d'audit)
grossiront avec l'usage réel des clients et ne peuvent pas être chargées intégralement
à chaque affichage.

## User story
En tant qu'utilisateur, je veux que les listes longues se chargent progressivement,
afin de ne pas attendre le chargement de milliers d'éléments.

## Critères d'acceptation
- [x] Les listes principales utilisent une pagination côté serveur (curseur ou offset)
      plutôt qu'un chargement complet.
- [x] Le composant `DataTable` (module `datatable`) gère le changement de page sans
      rechargement complet de la page.

## Notes techniques
Fichiers : `components/data-table/DataTable.tsx`,
`app/(protected)/admin/users/{page.tsx,actions.ts,page-size.ts,UsersDataTable.tsx,
UserFormDialog.tsx,DisableUserButton.tsx,RemoveMemberButton.tsx}`,
`app/(protected)/billing/invoices/{page.tsx,actions.ts,page-size.ts}`,
`components/billing/TransactionTable.tsx`,
`app/(protected)/settings/audit/{page.tsx,actions.ts,page-size.ts,AuditDataTable.tsx}`,
`lib/audit.ts`, `lib/audit-labels.ts` (nouveau).

Décisions à l'implémentation :
- **`components/data-table/DataTable.tsx`** — composant générique unique
  (module `datatable` du registre FATIHOUNE, jamais installé dans ce repo avant
  cet item) : colonnes déclaratives (`id`/`header`/`cell`), page 1 rendue
  côté serveur (`initialData`/`initialTotal`, aucun flash de chargement),
  changements de page via une **Server Action liée** (`fetchPage`, `page:
  number) => Promise<{data, total}>`) qui ne met à jour que l'état React local
  (`useState`/`useTransition`) — jamais de `router.push`/navigation, jamais de
  changement d'URL. Pas de tri/filtrage/sélection de colonnes intégré
  (au-delà du périmètre "S" de cet item) — les formulaires de recherche/filtre
  existants restent des `<form method="get">` classiques (rechargement complet
  au changement de *filtre*, acceptable : le critère ne porte que sur le
  changement de *page*).
- **Liaison des Server Actions** : chaque page fait
  `getXPageAction.bind(null, organization.id, ...filtres)` côté Server
  Component avant de passer la fonction résultante à un Client Component —
  les arguments liés d'une Server Action transmise ainsi sont scellés côté
  serveur (jamais falsifiables depuis le client), donc `organizationId` n'a
  pas besoin d'être revérifié contre une source indépendante ; `hasPermission`
  est quand même revérifié à chaque appel (une session peut expirer/changer de
  rôle entre deux pages).
- **3 listes converties** : `/admin/users` (offset déjà en place, Link-based
  → `DataTable`), `/billing/invoices` (aucune pagination avant cet item — tous
  les invoices chargés à chaque affichage), `/settings/audit` (offset déjà en
  place, Link-based → `DataTable`). Les filtres (recherche `/admin/users`,
  action/acteur `/settings/audit`) restent en formulaire GET classique.
- **Actions de ligne et rafraîchissement** (`/admin/users` uniquement — seule
  liste avec des mutations par ligne) : `DataTable` expose un `refresh()` aux
  cellules (`DataTableCellHelpers`) et un slot `toolbar` (pour le bouton
  "Nouvel utilisateur", situé hors des lignes) — `UserFormDialog`,
  `DisableUserButton`, `RemoveMemberButton` acceptent désormais un
  `onMutated?: () => void` appelé après succès, câblé sur `refresh` pour que
  la page courante du tableau reflète immédiatement une désactivation/un
  retrait/une modification, plutôt que de rester figée jusqu'à un changement
  de page manuel (le `revalidatePath`/`revalidateTag` déjà en place dans ces
  Server Actions ne suffit plus seul : il invalide le cache de navigation
  Next.js, pas l'état local du `DataTable`, qui ne re-render qu'après un appel
  explicite à `fetchPage`).
- **Bug de bundling découvert et corrigé** (bloquait `next build`) :
  `AuditDataTable.tsx` (Client Component) important `AUDIT_ACTION_LABELS`
  depuis `lib/audit.ts`, qui importe aussi `@/lib/prisma` (donc `pg`) —
  `pg` tente de résoudre `util/types` (module Node), absent du bundle
  navigateur → `Module not found`. Un import Client Component de *n'importe
  quel* export d'un fichier embarque tout le module, y compris ses imports non
  utilisés par cet export (même principe que le commentaire déjà présent dans
  `lib/organization-actions.ts`, ITEM-015). Corrigé en extrayant
  `AUDIT_ACTION_LABELS` dans `lib/audit-labels.ts` (aucune dépendance
  serveur), importé directement par le Client Component ; `lib/audit.ts`
  réexporte la constante pour ne rien casser côté serveur existant.
- Vérifié fonctionnellement en dev (pas seulement lu) : ~15 utilisateurs et 25
  entrées d'audit seedés temporairement pour dépasser une page, piloté via
  Playwright sur le serveur dev réel — clic sur "Suivant" (`/admin/users` et
  `/settings/audit`) → contenu de la table change (première ligne différente),
  **zéro** événement `load` de page complète, URL inchangée (pas de
  `?page=`) : confirme que le changement de page n'est ni une navigation ni un
  rechargement. Données de test supprimées après vérification (cascade
  `Membership` incluse, aucune ligne orpheline). `tsc --noEmit`, `eslint .`,
  `pnpm test` (28/28) et `next build` (production) tous clean.

## Hors périmètre (délibéré)
Liste des **documents** (`/documents`, `/documents/[folderId]`) non convertie en
`DataTable` — c'est un explorateur dossiers+documents (glisser-déposer, menu
contextuel, fil d'Ariane), pas une table plate à lignes homogènes ; y retrofiter
`DataTable` toucherait plusieurs fonctionnalités livrées par ITEM-028/029/032/033/034
pour un bénéfice incertain (les explorateurs de fichiers paginent rarement une vue de
dossier — ils chargent tout ou lazy-load au scroll, un patron différent). Suggestion :
item dédié si le volume de fichiers par dossier devient un problème réel en usage.

## Captures attendues
Liste paginée avec navigation entre pages sans rechargement complet visible. Vérifié
en dev via Playwright (voir Notes techniques) : contenu changé, zéro `load` de page,
URL inchangée sur `/admin/users` et `/settings/audit`.

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-17 (implement) — démarrage
- 2026-07-17 (implement) — implémenté : `components/data-table/DataTable.tsx`
  (composant générique, pagination serveur sans navigation, slots
  cellule/toolbar pour rafraîchir après mutation). Converti 3 listes :
  `/admin/users` (Link-based → DataTable, actions de ligne câblées sur
  `refresh`), `/billing/invoices` (aucune pagination avant cet item → offset
  + DataTable), `/settings/audit` (Link-based → DataTable). Bug de bundling
  Client/Server découvert et corrigé (`lib/audit-labels.ts` extrait de
  `lib/audit.ts` pour ne plus embarquer Prisma/`pg` côté client). Fichiers :
  voir liste complète en Notes techniques. Vérifié fonctionnellement en dev
  (Playwright, données seedées temporairement) : pagination sans rechargement
  confirmée sur les 2 listes converties avec assez de volume pour paginer
  réellement. `tsc --noEmit`, `eslint .`, `pnpm test` et `next build` tous
  clean. Documents list exclue du périmètre — voir section dédiée.
