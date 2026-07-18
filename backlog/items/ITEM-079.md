---
id: ITEM-079
title: DataTable — recherche en chip, pagination toujours visible, action pilotable depuis l'en-tête
status: implemented
priority: P2
type: bug
estimate: M
depends_on: [ITEM-076, ITEM-077]
created: 2026-07-18
updated: 2026-07-18
---

## Idée / contexte
Retours concrets de l'utilisateur après avoir vu `/admin/users` (ITEM-076/077) en
conditions réelles, avec capture d'écran à l'appui : trois défauts sur le composant
`DataTable`/le gabarit de page partagés, pas seulement sur `/admin/users` :

1. Le champ de recherche (`<form method="get">` texte + bouton « Rechercher ») est
   sur sa propre ligne, séparée de la ligne des chips de filtre (Rôle, Statut) —
   l'utilisateur veut la recherche **sur la même ligne**, sous la forme d'un chip
   similaire (« + Rechercher », qui fait apparaître un champ au clic) plutôt qu'un
   champ texte en permanence visible.
2. La pagination n'est pas visible du tout — `DataTablePagination` retourne
   actuellement `null` dès qu'il n'y a qu'une seule page (`totalPages <= 1`), ce qui
   masque même le résumé du nombre d'éléments.
3. Le bouton d'action principal (« Nouvel utilisateur ») doit pouvoir se placer en
   haut à droite, à côté du titre (`ListPageHeader.actions`, ITEM-077) plutôt que
   dans la barre d'outils du `DataTable` — actuellement impossible sans régression
   (le rafraîchissement après création dépend d'un callback interne au `DataTable`,
   inaccessible depuis un composant frère comme l'en-tête de page).

## User story
En tant qu'utilisateur d'une page liste CRUD, je veux une recherche accessible au
même endroit que les autres filtres, une pagination toujours visible, et le bouton
d'action principal placé avec le titre de la page, afin d'avoir une interface
cohérente et prévisible sur toutes les pages du projet.

## Critères d'acceptation
- [x] Le `DataTable` propose une recherche texte intégrée sous forme de chip (même
      ligne, même style que les chips de filtre par colonne) plutôt qu'un champ
      séparé porté par la page appelante — le clic sur le chip fait apparaître un
      champ de saisie (popover), la valeur est appliquée comme un filtre de plus
      transmis à `fetchPage`.
- [x] `/admin/users` utilise cette recherche intégrée à la place de son formulaire
      `<form method="get">` actuel — même comportement de recherche par nom/e-mail
      qu'aujourd'hui, juste déplacé/restylé.
- [x] Le résumé de pagination (« Page X / Y · Z éléments ») reste visible même
      lorsqu'il n'y a qu'une seule page — seuls les boutons Précédent/Suivant peuvent
      être masqués ou désactivés quand il n'y a rien vers quoi naviguer.
- [x] `DataTable` expose un moyen (ex. référence impérative `ref.refresh()`) de
      déclencher un rafraîchissement des données depuis un composant placé en dehors
      de son propre arbre — sans quoi une action de création ne peut jamais migrer
      vers `ListPageHeader.actions` sans casser le rafraîchissement après mutation.
- [x] `/admin/users` : le bouton « Nouvel utilisateur » est déplacé dans
      `ListPageHeader.actions` (haut à droite, avec le titre) et continue de
      rafraîchir la liste après création, sans régression.

## Notes techniques
Périmètre volontairement limité aux capacités du `DataTable`/gabarit partagés et à
leur démonstration sur `/admin/users` (déjà la page de référence) — appliquer ces
mêmes correctifs à `/admin/invitations` ou à d'autres pages est couvert par les items
de migration dédiés (ITEM-080 et suivants), pas celui-ci.

Recherche en chip : probablement une variante de `DataTableFilterChip` (ITEM-076) ou
un chip dédié `DataTableSearchChip` (le texte de recherche ne cible pas une colonne
précise, contrairement aux filtres existants — porte plutôt sur plusieurs champs à la
fois, nom+e-mail par ex.) intégré à `DataTableToolbar`. Sa valeur doit rejoindre
`DataTableFetchContext` (nouveau champ `search?: string` à côté de `sort`/`filters`,
ou repris comme une entrée réservée de `filters` — à trancher à l'implémentation,
mais documenté clairement pour ne pas confondre avec un filtre par colonne).

Référence impérative : `DataTable` passe de fonction à `forwardRef` exposant au moins
`{ refresh: () => void }` (réutilise `loadPage(page)` déjà existant en interne). Un
composant client englobant (ex. nouveau `UsersSection.tsx`, wrapper client autour de
`ListPageHeader` + `UsersDataTable`) est nécessaire pour partager cette référence
entre le bouton d'en-tête et la table — `page.tsx` restant un Server Component ne
peut pas détenir de `ref` lui-même. Les onglets/cartes de statistiques (Server
Components, ITEM-077) n'ont pas besoin d'entrer dans ce wrapper client, seuls
l'en-tête (à cause de ses actions) et la table en ont besoin.

Fichiers attendus : `components/data-table/{types.ts,DataTable.tsx,
DataTableToolbar.tsx,DataTablePagination.tsx}` (étendus), nouveau
`components/data-table/DataTableSearchChip.tsx` (ou équivalent), `app/(protected)/
admin/users/{page.tsx,UsersDataTable.tsx,actions.ts}`, nouveau composant client
englobant pour `/admin/users`.

Décisions à l'implémentation :
- **`DataTableFetchContext` gagne `search: string`** (à côté de `sort`/`filters`,
  jamais `null`, chaîne vide = pas de recherche) — distinct des filtres par colonne
  dans le typage, mais transmis au même endroit ; `getUsersPageAction` le lit via
  `context?.search` et l'applique au même `OR` nom/e-mail qu'avant (paramètre bound
  `q` retiré de sa signature — la recherche n'est plus une donnée d'URL, uniquement
  un état du `DataTable`, cohérent avec les autres filtres qui ne sont pas non plus
  synchronisés à l'URL).
- **`DataTableSearchChip.tsx`** (nouveau) : mêmes principes que
  `DataTableFilterChip` (Popover, bouton actif/inactif, bouton de retrait séparé du
  déclencheur) mais icône loupe et sans notion de colonne — rendu en premier dans
  `DataTableToolbar`, avant les chips de filtre par colonne.
- **`DataTablePagination`** : le résumé (`Page X / Y · Z éléments`) est maintenant
  toujours rendu ; seuls les boutons Précédent/Suivant restent conditionnés par
  `totalPages`.
- **`DataTable` en `forwardRef`** exposant `{ refresh: () => void }`
  (`DataTableHandle`, nouveau type) — le générique `<T>` ne pouvant pas traverser
  `forwardRef` nativement en TypeScript, exporté via le cast standard
  `forwardRef(...) as <T>(props: ...) => ReactElement`. `loadPage` passé en
  `useCallback` (dépendances `fetchPage`/`sort`/`filters`/`search`) pour que
  `useImperativeHandle` ait une dépendance stable et complète (pas d'avertissement
  `exhaustive-deps`).
- **Nouveau `UsersPageClient.tsx`** : enveloppe cliente autour de `ListPageHeader`
  (bouton « Nouvel utilisateur » dans `actions`, appelant `tableRef.current?.refresh()`)
  et de `UsersDataTable` (désormais aussi `forwardRef`, transmet la ref à
  `DataTable`). Accepte un `children` pour `ListPageTabs`/`CategoryStatCards`
  (Server Components, ITEM-077) rendus PAR `page.tsx` mais affichés ENTRE l'en-tête
  et la table — un Server Component passé en `children` à un Client Component reste
  rendu côté serveur, pas besoin qu'il devienne lui-même client.
- **`page.tsx` simplifié** : plus de `<form method="get">` ni de paramètre `q` —
  seul `status` (ITEM-077, cartes de statistiques) reste dérivé de l'URL.

Vérifications effectuées : `npx tsc --noEmit`, `npx eslint .` (aucune erreur, y
compris après correction d'un avertissement `react-hooks/exhaustive-deps` sur
`useImperativeHandle`), `npx vitest run` (68 tests, inchangés). `npx next build`
OK. Testé en conditions réelles via `next build` + `next start` sur un port séparé
(arrêté après coup, dev server existant non touché), en extrayant l'ordre réel du
texte rendu (HTML dépouillé de ses balises) : confirmé
« Utilisateurs|Invitations|Tout|1|Actifs|1|Désactivés|0|Rechercher par nom ou
e-mail| |Rôle| |Statut| Importer| Exporter| Modifier les colonnes| » — la recherche
est bien sur la même ligne que Rôle/Statut, dans cet ordre. Confirmé aussi : le
résumé de pagination (« Page 1 / 1 · 1 élément ») est présent malgré une seule page
(régression corrigée) ; le bouton « Nouvel utilisateur » apparaît immédiatement
après le titre/la description (dans l'en-tête, plus dans la barre d'outils de la
table) ; `/billing/invoices` et `/settings/audit` (non migrés) répondent toujours
200 sans régression. Le clic effectif sur les chips (ouverture du popover, saisie,
application) et la vérification que « Nouvel utilisateur » rafraîchit bien la liste
après une création réelle nécessitent un navigateur — non vérifiés par requêtes
HTTP statiques, à confirmer par `backlog-test`.

## Captures attendues
`/admin/users` : recherche en chip sur la même ligne que Rôle/Statut ; pagination
visible même avec une seule page ; « Nouvel utilisateur » en haut à droite avec le
titre, création suivie d'un rafraîchissement effectif de la liste.

## Journal
- 2026-07-18 (backlog) — créé à partir d'un retour utilisateur concret (capture
  d'écran) sur `/admin/users` : recherche mal positionnée, pagination invisible,
  action principale mal placée. Scindé de la migration `/admin/invitations`
  (ITEM-080), qui dépend de ces correctifs pour reproduire la même structure.
- 2026-07-18 (implement) — démarrage
- 2026-07-18 (implement) — implémenté : recherche intégrée en chip
  (`DataTableSearchChip`), pagination toujours visible, `DataTable`/`UsersDataTable`
  en `forwardRef` (`DataTableHandle.refresh()`), nouveau `UsersPageClient.tsx`
  plaçant « Nouvel utilisateur » dans l'en-tête. `page.tsx` simplifié (recherche
  retirée de l'URL). Fichiers listés en Notes techniques.
