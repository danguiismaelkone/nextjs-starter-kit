---
id: ITEM-080
title: Migrer /admin/invitations vers le gabarit CRUD standard (même structure que /admin/users)
status: implemented
priority: P2
type: chore
estimate: M
depends_on: [ITEM-078, ITEM-079]
created: 2026-07-18
updated: 2026-07-18
---

## Idée / contexte
Demande explicite de l'utilisateur : « utilisateurs et invitations doivent avoir la
même structure ». `/admin/invitations` est aujourd'hui la seule page directement
liée à `/admin/users` (déjà croisées par les onglets ITEM-077) qui n'a **pas** été
migrée vers le nouveau gabarit — elle utilise encore une table shadcn manuelle, sans
pagination, sans tri/filtres, sans cartes de statistiques.

## User story
En tant qu'admin, je veux que la page Invitations suive exactement la même structure
que la page Utilisateurs (en-tête, onglets, cartes de statistiques, DataTable
enrichi), afin de naviguer entre les deux sans changement de repères.

## Critères d'acceptation
- [x] `/admin/invitations` utilise `ListPageHeader` (titre à gauche, bouton « Inviter »
      en haut à droite — même emplacement que « Nouvel utilisateur » sur
      `/admin/users`, ITEM-079) et `ListPageTabs` (Utilisateurs ↔ Invitations,
      cohérent avec les onglets déjà présents sur `/admin/users`).
- [x] `/admin/invitations` affiche des cartes de statistiques par statut (En attente /
      Acceptées / Révoquées), cliquables, filtrant via l'URL (`CategoryStatCards`,
      même mécanique que Actifs/Désactivés sur `/admin/users`).
- [x] La table des invitations utilise le `DataTable` enrichi (pas la table shadcn
      manuelle actuelle) : pagination serveur (actuellement absente — toutes les
      invitations sont chargées sans limite), tri sur au moins une colonne (ex. date
      d'expiration), filtre par statut, recherche en chip (ITEM-079) sur l'e-mail.
- [x] Les actions existantes (renvoyer, révoquer une invitation en attente) restent
      fonctionnelles, inchangées dans leur comportement.
- [x] Aucune régression : scoping par organisation, garde d'accès admin
      (ITEM-016/ITEM-018) inchangés.

## Notes techniques
Dépend d'ITEM-078 (page `/admin/users` finalisée, gabarit prouvé de bout en bout) et
d'ITEM-079 (recherche en chip + référence impérative nécessaires pour reproduire
exactement la même structure, notamment le bouton d'action dans l'en-tête).

`prisma.invitation.findMany` charge aujourd'hui **toutes** les invitations sans
pagination — contrairement à `/admin/users` (paginé depuis ITEM-061). Migrer vers
`DataTable` corrige ce point au passage (pagination serveur requise par le composant),
sans que ce soit un item de pagination à part entière : conséquence directe de
l'adoption du nouveau standard, pas un objectif séparé.

`InvitationRowActions` (renvoyer/révoquer) devient les actions de ligne d'une colonne
`DataTableColumn` dédiée, comme `UsersDataTable` le fait déjà pour ses propres
actions de ligne.

Fichiers attendus : `app/(protected)/admin/invitations/{page.tsx,actions.ts}`,
nouveau `InvitationsDataTable.tsx` (miroir de `UsersDataTable.tsx`), nouveau
`page-size.ts` (pagination, absente aujourd'hui).

**Implémentation** : structure identique à `/admin/users` (ITEM-078/079), sans code
dupliqué au-delà du nécessaire :
- `page-size.ts` : `INVITATIONS_PAGE_SIZE = 10` (miroir de `USERS_PAGE_SIZE`).
- `actions.ts` : ajout de `InvitationRow` et `getInvitationsPageAction(organizationId,
  page, context?)` — même schéma que `getUsersPageAction` (`getSession` +
  `hasPermission` plutôt que `requireAdmin`, car appelée en tant que Server Action
  liée côté client) ; `SORTABLE_FIELDS` limité à `email`/`expiresAt` (les seules
  colonnes triables) ; recherche sur `email` uniquement (pas de nom sur une
  invitation) ; filtre `status` direct (valeurs `pending`/`accepted`/`revoked` déjà
  celles du champ Prisma, pas de mapping supplémentaire).
- `InviteDialog.tsx` : ajout d'un prop optionnel `onMutated` (même pattern que
  `UserFormDialog`), appelé après un envoi réussi, en plus de la fermeture du
  dialog déjà existante.
- `InvitationsDataTable.tsx` (nouveau, miroir de `UsersDataTable.tsx`) : colonnes
  E-mail (triable, exportable), Rôle (badge, non triable/filtrable — jugé inutile
  ici, contrairement à `/admin/users` où c'est un filtre demandé), Statut (badge +
  filtre select 3 valeurs, réutilise les libellés `STATUS_LABELS`/`STATUS_VARIANTS`
  déjà existants dans l'ancien `page.tsx`), Expire le (triable), Actions
  (`InvitationRowActions`, rendu uniquement si `status === "pending"`, comportement
  inchangé). Pas de `bulkActions`/`enableExport`/`onImport` : aucun critère
  d'acceptation ne les demande pour cette page (contrairement à `/admin/users`,
  ITEM-076) — décision volontaire de rester dans le périmètre de l'item plutôt que
  de dupliquer toutes les capacités du DataTable par symétrie.
- `InvitationsPageClient.tsx` (nouveau, miroir de `UsersPageClient.tsx`) : même
  wrapper client `ref`-based, bouton « Inviter » dans `ListPageHeader.actions`.
- `page.tsx` : réécrit sur le modèle de `/admin/users/page.tsx` — `requireAdmin` +
  `requireOrganization`, `searchParams.status`, requêtes Prisma parallèles
  (page courante paginée + 4 comptages par statut, indépendants du filtre actif),
  `ListPageTabs` (mêmes deux onglets que sur `/admin/users`, actifs par route) et
  `CategoryStatCards` passés en `children` de `InvitationsPageClient`.

Vérifications effectuées : `npx tsc --noEmit`, `npx eslint` (sur les deux dossiers
admin), `npx vitest run` (68 tests, inchangés), `npx next build` — tous sans erreur.
Testé en conditions réelles via `next build` + `next start` sur un port séparé
(arrêté après coup, dev server existant non touché) : connexion réelle avec le
compte de démo (`owner@example.com`), 4 invitations de test insérées directement en
base (2 pending, 1 accepted, 1 revoked) puis nettoyées après coup. Confirmé par
extraction de texte HTML : ordre exact « Invitations|Invitations envoyées par
Organisation de démo| Inviter|Utilisateurs|Invitations|Tout|4|En attente|2|
Acceptées|1|Révoquées|1|Rechercher par e-mail| |Statut| Modifier les colonnes|
E-mail|Rôle|Statut|Expire le|Actions|... » — en-tête, onglets, cartes, barre
d'outils (recherche + filtre statut, pas d'export/import), colonnes, dans cet
ordre. Filtre `?status=pending` vérifié réellement : 2 lignes retournées (au lieu
de 4), carte « En attente » active (`border-primary ring-1 ring-primary` présent
une seule fois), chip de filtre « Statut : En attente » avec bouton « Effacer les
filtres » visibles. Boutons d'action « Renvoyer »/« Révoquer »
(`aria-label`) comptés : exactement 2 (les 2 invitations `pending`), absents des
lignes `accepted`/`revoked` — comportement inchangé de l'ancien `InvitationRowActions`.
Pagination toujours visible même à 1 page (« Page 1 / 1 · 4 éléments »). Aucune
régression : `/admin/users`, `/billing/invoices`, `/settings/audit` répondent tous
200. Le clic effectif sur les chips/cartes et le rafraîchissement après un envoi
réel d'invitation (via le dialog, pas une insertion directe en base) nécessitent un
navigateur — non vérifiés par requêtes HTTP statiques, à confirmer par
`backlog-test`.

## Captures attendues
`/admin/invitations` avec en-tête (titre + bouton Inviter en haut à droite), onglets
Utilisateurs/Invitations, cartes de statistiques par statut cliquables, DataTable
paginé avec recherche en chip et tri, visuellement au même gabarit que
`/admin/users`. Clic sur une carte de statut (ex. « En attente ») filtrant
effectivement la liste et mettant à jour l'URL ; clic sur le chip de recherche
ouvrant un champ e-mail ; envoi d'une invitation réelle depuis le dialog rafraîchissant
la liste sans rechargement de page.

## Journal
- 2026-07-18 (backlog) — créé à partir d'un retour utilisateur demandant la même
  structure entre `/admin/users` et `/admin/invitations`. Dépend d'ITEM-078
  (page de référence finalisée) et ITEM-079 (correctifs DataTable nécessaires à la
  parité).
- 2026-07-18 (implement) — démarrage
- 2026-07-18 (implement) — implémenté : `/admin/invitations` migré vers le gabarit
  CRUD standard (même structure que `/admin/users`) — `ListPageHeader` + `Invite
  Dialog` en en-tête, `ListPageTabs`, `CategoryStatCards` par statut,
  `InvitationsDataTable` (DataTable enrichi : pagination serveur désormais
  bornée, tri e-mail/expiration, filtre statut, recherche en chip sur l'e-mail),
  `InvitationsPageClient` (ref impérative pour rafraîchir après invitation).
  `InvitationRowActions` (renvoyer/révoquer) conservé tel quel, désormais colonne
  de `DataTable`. Fichiers : `page.tsx` (réécrit), `actions.ts` (étendu),
  `InviteDialog.tsx` (ajout `onMutated`), nouveaux `page-size.ts`,
  `InvitationsDataTable.tsx`, `InvitationsPageClient.tsx`.
