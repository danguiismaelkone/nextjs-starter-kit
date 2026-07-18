---
id: ITEM-090
title: Pages pleine largeur (retrait du plafond max-w-7xl) + généraliser PageHeader/DetailPageLayout à toute l'application
status: implemented
priority: P2
type: chore
estimate: L
depends_on: [ITEM-085, ITEM-086, ITEM-088]
created: 2026-07-18
updated: 2026-07-18
---

## Idée / contexte
Demande directe de l'utilisateur, deux captures d'écran à l'appui : la page
`/documents` n'utilisait qu'une bande étroite de l'écran (beaucoup d'espace vide à
droite) alors que `/dashboard` remplissait toute la largeur disponible — « corrige et
fait en sorte que toutes les pages puissent prendre tout l'espace disponible ».
Suivi d'une seconde demande, dans la foulée : « est-ce que tu pourrais corriger
toutes les pages avec les nouveaux composants que tu as créés ? » (les composants
d'ITEM-085/ITEM-086).

Root cause du problème de largeur : `app/(protected)/layout.tsx` appliquait
`max-w-7xl mx-auto` à **toutes** les pages protégées, sans distinction — un plafond
de 1280px centré, quel que soit le contenu de la page. Sur un écran large, ce
plafond crée systématiquement une marge vide à droite (et à gauche, puisque
centré) ; les deux captures de l'utilisateur montraient probablement le même plafond
sous deux états de sidebar différents (repliée/dépliée), ce qui donnait l'illusion
d'une incohérence entre pages alors que la cause était globale et uniforme. Plutôt
que de chercher un plafond « plus grand mais toujours limité », la demande explicite
de l'utilisateur (« tout l'espace disponible ») est traitée littéralement : retrait
du plafond.

En parallèle, ITEM-085/ITEM-086/ITEM-088 n'avaient migré que 3 pages
(`/roles/[id]`, `/admin/users`, `/admin/invitations`) et ITEM-089 (à ce stade encore
`todo`) n'en couvrait que 3 de plus. Cet item couvre le reste de l'application
protégée pour que le nouveau gabarit soit effectivement le standard partout, pas
seulement sur un échantillon.

## User story
En tant qu'utilisateur de l'application, je veux que toutes les pages utilisent
l'espace disponible à l'écran et partagent le même gabarit d'en-tête/contenu, afin
d'avoir une expérience visuelle cohérente et de ne pas voir d'espace gâché sur les
pages à fort contenu (tableaux, explorateur de documents…).

## Critères d'acceptation
- [x] `app/(protected)/layout.tsx` ne plafonne plus la largeur du contenu
      (`max-w-7xl mx-auto` retiré) — toute page protégée occupe 100% de la largeur
      disponible à côté de la sidebar, quelle que soit la largeur de l'écran.
- [x] Toutes les pages de navigation principale restantes (non couvertes par
      ITEM-085/087/088/089) utilisent `PageHeader` pour leur en-tête : `/dashboard`,
      `/documents` (+ `/documents/[folderId]`), `/documents/generate`,
      `/documents/trash`, `/ai/chat`, `/ai/generate`, `/roles` (liste),
      `/billing/invoices`, `/settings` (hub), `/settings/api-keys`,
      `/settings/audit`, `/settings/notifications`, `/settings/webhooks`,
      `/settings/organizations/[id]/branding`, `/domain`, `/sso`, `/superadmin`,
      `/superadmin/users`, `/superadmin/flags`.
- [x] Les pages fil d'Ariane (« retour à… ») existantes (`/documents/trash`,
      `/settings/notifications`, les trois sous-pages `/settings/organizations/[id]/*`)
      utilisent le fil d'Ariane de `DetailPageLayout` plutôt qu'un lien de retour
      ad hoc.
- [x] Le repli en menu d'actions (ITEM-085) est exercé par au moins deux pages
      réelles à plusieurs actions : `/dashboard` (2 actions) et `/documents`
      (3 actions, dont l'action « Nouveau dossier » qui ouvre un dialogue).
- [x] `/billing/plans` (page de tarifs centrée, volontairement différente des pages
      d'administration) n'est **pas** migrée vers `PageHeader` — présentation
      délibérément distincte (grille de plans centrée), hors du périmètre de cette
      uniformisation. Documenté explicitement plutôt que migré par erreur.
- [x] Aucune régression TypeScript/lint/build/tests après la migration complète.
- [x] Vérifié en conditions réelles (navigateur, pas seulement lecture de code) :
      connexion avec un compte de démo, captures d'écran de plusieurs pages migrées,
      redimensionnement de fenêtre pour confirmer le repli en menu.

## Notes techniques
Fichiers concernés (en plus de ceux d'ITEM-085/086/087/088/089) :
- `app/(protected)/layout.tsx` (retrait du plafond de largeur)
- `components/layout/PageHeaderActions.tsx` (nouveau — voir correctif ci-dessous)
- `app/(protected)/dashboard/page.tsx`
- `app/(protected)/ai/chat/page.tsx`, `app/(protected)/ai/generate/page.tsx`
- `app/(protected)/billing/invoices/page.tsx`
- `app/(protected)/documents/generate/page.tsx`,
  `components/documents/DocumentsExplorer.tsx`, `components/documents/TrashView.tsx`
- `app/(protected)/roles/page.tsx`
- `app/(protected)/settings/page.tsx`, `.../api-keys/page.tsx`, `.../audit/page.tsx`,
  `.../notifications/page.tsx`, `.../webhooks/page.tsx`
- `app/(protected)/settings/organizations/[id]/branding/page.tsx`, `.../domain/page.tsx`,
  `.../sso/page.tsx`
- `app/(protected)/superadmin/page.tsx`, `.../users/page.tsx`, `.../flags/page.tsx`

Décisions à l'implémentation :
- **Pages à formulaire unique restées volontairement étroites** (`ai/generate`,
  `documents/generate`, `settings/api-keys`, `settings/webhooks` : `max-w-2xl`/
  `max-w-3xl` conservés) — seul l'en-tête (`PageHeader`) a été substitué à l'ancien
  bloc titre/description ad hoc, la largeur du **contenu** (formulaire) reste un
  choix de lisibilité délibéré, distinct du problème de largeur signalé par
  l'utilisateur (qui concernait des pages à fort contenu comme `/documents`, pas des
  formulaires courts).
- **Correctif critique découvert en testant en conditions réelles** (voir aussi
  Journal d'ITEM-085) : le mécanisme de repli en menu d'ITEM-085, basé sur des
  classes responsives `sm:`, ne fonctionnait pas réellement — `/documents` (3
  actions) passait à la ligne au lieu de se replier, repéré uniquement en pilotant
  l'application avec Playwright (pas visible en lecture de code ni en `next build`).
  Remplacé par une mesure JS réelle de la largeur disponible
  (`components/layout/PageHeaderActions.tsx`, `ResizeObserver` + comparaison de rects
  du premier/dernier bouton, pas `scrollWidth` — piégeux avec un alignement à droite).
  Un deuxième bug (grille sans `min-w-0`, piège classique `min-width: auto` des
  enfants flex/grid) empêchait la colonne d'actions de se laisser contraindre à sa
  largeur réelle. Les deux corrigés avant de considérer le repli fiable.
- **`DocumentsExplorer.tsx`** : le fil d'Ariane interactif (glisser-déposer des
  fichiers/dossiers vers une entrée du fil) ne peut pas passer par
  `DetailPageLayout.breadcrumbs` (simple `{label, href}[]`, sans gestion d'événements
  `onDrag*`) — conservé tel quel au-dessus de `PageHeader`, sans passer par
  `DetailPageLayout`.
- **`/profile`, `/billing`, `/settings/organizations/[id]`** : déjà couverts par
  ITEM-089, implémenté dans le même effort (voir son propre Journal).

Vérifications effectuées : `npx tsc --noEmit`, `npx eslint .` (0 erreur, 1 warning
préexistant sans rapport dans `app/(protected)/layout.tsx`), `npx next build`
(61 routes), `npx vitest run` (68 tests) — tous OK. Vérification Playwright en
conditions réelles contre le serveur de dev existant de l'utilisateur (déjà lancé,
rechargé à chaud) : connexion avec le compte seed (`owner@example.com`), captures de
`/dashboard`, `/documents`, `/billing`, `/profile`, `/roles` en pleine largeur ;
`/dashboard` à 900px de large garde ses 2 boutons visibles (assez de place) ;
`/documents` à 700px de large replie ses 3 actions dans un bouton menu qui, ouvert,
liste bien les 3 actions.

## Captures attendues
`/documents` et `/dashboard` côte à côte à la même largeur d'écran, montrant que les
deux utilisent désormais tout l'espace disponible de la même façon. `/dashboard`
avec ses 2 actions repliées en menu sur un écran étroit ; `/documents` avec ses 3
actions repliées en menu, menu ouvert.

## Journal
- 2026-07-18 (backlog + implement) — créé et implémenté dans la foulée, en réponse à
  une demande directe de l'utilisateur (deux captures d'écran comparant `/documents`
  et `/dashboard`, puis « corrige toutes les pages avec les nouveaux composants »).
  Racine du problème de largeur identifiée (`max-w-7xl mx-auto` global dans
  `app/(protected)/layout.tsx`) et retirée ; migration étendue à toutes les pages
  restantes de la navigation protégée ; bug réel du repli en menu découvert et
  corrigé en testant avec Playwright plutôt qu'en se fiant à la lecture de code.
  `billing/plans` explicitement laissée de côté (page de tarifs centrée,
  volontairement différente). Item créé rétroactivement pour tracer ce travail dans
  le backlog, la demande utilisateur étant arrivée en dehors du flux
  `/backlog-implement ITEM-XXX` habituel.
