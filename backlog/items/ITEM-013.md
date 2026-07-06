---
id: ITEM-013
title: Créer un utilisateur dans une modale (au lieu d'une page dédiée)
status: verified
priority: P2
type: feature
estimate: S
depends_on: [ITEM-007, ITEM-011, ITEM-012]
created: 2026-07-05
updated: 2026-07-05
---

## Idée / contexte
La création d'un utilisateur passe aujourd'hui par une **page dédiée**
(`/admin/users/new`), atteinte via le bouton « Nouvel utilisateur » de la toolbar
DataTable (`createHref`) et le raccourci du tableau de bord. Ce détour rompt le flux :
l'admin quitte la liste, crée, puis revient (`router.push("/admin/users")`).
On veut ouvrir le formulaire de création dans une **modale** (primitive `Dialog`
déjà présente, `components/ui/dialog.tsx`) déclenchée depuis la liste, sans
changer de page. Item purement UI/flux : **aucun changement de logique métier ni
de server action** (`createUser`).

## User story
En tant qu'administrateur, je veux créer un utilisateur dans une fenêtre modale
depuis la liste des utilisateurs, afin de rester dans mon contexte et d'ajouter un
compte sans navigation ni rechargement de page.

## Critères d'acceptation
- [x] Un bouton « Nouvel utilisateur » sur `/admin/users` ouvre une **modale**
      (`Dialog`) contenant le formulaire de création, au lieu de naviguer vers
      `/admin/users/new`.
- [x] Le formulaire de création (`UserCreateForm`) est **réutilisé** dans la modale
      (nom, e-mail, mot de passe initial, rôle) avec la même validation client et les
      mêmes messages d'erreur par champ.
- [x] À la **création réussie** : la modale se ferme, la liste des utilisateurs se met
      à jour (`router.refresh()`) et le nouvel utilisateur y apparaît — sans navigation
      vers une autre page.
- [x] En cas d'**erreur serveur** (ex. e-mail déjà utilisé), le message s'affiche dans
      la modale qui **reste ouverte**, sans perte des champs saisis.
- [x] Boutons « Annuler » et fermeture (icône ✕ / Échap / clic sur l'overlay) ferment
      la modale sans créer de compte ; la soumission en cours désactive les champs et le
      bouton (état « Création… »).
- [x] Le raccourci « Nouvel utilisateur » du tableau de bord (`app/admin/page.tsx`)
      reste cohérent : soit il ouvre la même modale, soit il renvoie vers la liste où la
      modale est disponible (pas de lien mort).
- [x] Responsive : la modale et le formulaire restent lisibles et utilisables sur mobile.
- [x] **Non-régression** : la création d'utilisateur (validation, rôles, erreurs) reste
      conforme à ITEM-007.

## Notes techniques
- Fichiers : `components/admin/user-create-form.tsx` (rendre le succès configurable :
  `onSuccess`/callback plutôt que `router.push` en dur), un nouveau composant client
  `components/admin/user-create-dialog.tsx` (trigger + `Dialog` + form), et l'insertion
  du trigger dans la liste `components/admin/users-columns.tsx`.
- **Placement du bouton** : la toolbar DataTable n'expose aujourd'hui qu'un
  `createHref` (rendu en `<Link>`). Deux options — (a) étendre le module DataTable avec
  un slot d'action de création (ex. `createSlot`/`renderCreateAction`) pour garder le
  bouton dans la toolbar (**recommandé** : conserve l'emplacement attendu, réutilisable),
  ou (b) déplacer le trigger dans les actions du `PageHeader` de `/admin/users` et
  retirer `createHref`. Choisir (a) si le slot reste générique ; sinon (b).
- **Sort de la page `/admin/users/new`** : par défaut, la conserver fonctionnelle
  (deep-links, fallback sans JS) — la modale devient le chemin principal. Ne pas la
  supprimer dans cet item pour éviter les liens morts ; une suppression éventuelle sera
  un chore séparé.
- Réutiliser la primitive `Dialog` existante (`DialogTrigger`, `DialogContent`,
  `DialogHeader`, `DialogTitle`, `DialogDescription`). Ne pas toucher aux server actions
  (`app/admin/users/actions.ts`). shadcn/ui + Tailwind ; texte FR / code EN.

## Captures attendues
Bouton « Nouvel utilisateur » sur la liste ; modale de création ouverte avec le
formulaire ; message d'erreur affiché dans la modale restée ouverte (e-mail déjà pris) ;
liste mise à jour après création réussie (modale fermée) ; rendu mobile de la modale.

## Journal
- 2026-07-05 (backlog) — créé
- 2026-07-05 (implement) — démarrage
- 2026-07-05 (implement) — implémenté : modale de création via nouvelle `UserCreateDialog` déclenchée depuis la toolbar de la liste (slot générique `createSlot` ajouté au module DataTable — option (a)). `UserCreateForm` rendu réutilisable (`onSuccess`/`onCancel`, comportement page inchangé par défaut). Raccourci dashboard → `/admin/users?new=1` (auto-ouverture de la même modale, param nettoyé à la fermeture). Page `/admin/users/new` conservée en fallback. Server action `createUser` non modifiée. tsc + lint + `next build` OK. Fichiers : components/admin/user-create-dialog.tsx, components/admin/user-create-form.tsx, components/admin/users-columns.tsx, components/data-table/types.ts, components/data-table/DataTable.tsx, components/data-table/DataTableToolbar.tsx, app/admin/page.tsx

## Décisions d'implémentation
- **Placement du bouton — option (a)** : ajout d'un slot générique `createSlot?: ReactNode` au module DataTable (types + `DataTable` + `DataTableToolbar`), prioritaire sur `createHref`. Le bouton reste dans la toolbar (emplacement attendu) et le slot est réutilisable par d'autres tables.
- **Réutilisation du formulaire** : `UserCreateForm` accepte `onSuccess`/`onCancel` optionnels ; sans props il garde le comportement page (`router.push("/admin/users")`). Le `router.refresh()` post-succès est toujours déclenché par le formulaire (une seule source).
- **Raccourci dashboard** : `?new=1` auto-ouvre la modale sur l'onglet Utilisateurs (tab par défaut) puis le param est retiré via `router.replace` à la fermeture pour éviter une réouverture au refresh.
- **Fermeture** : gérée par Radix `Dialog` (✕/Échap/overlay) + bouton « Annuler » (`onCancel`). Le contenu se démonte à la fermeture → champs réinitialisés à la réouverture ; en cas d'erreur serveur la modale reste ouverte avec les champs conservés.
- **`/admin/users/new`** conservée telle quelle (fallback/deep-link) — suppression éventuelle = chore séparé.
- 2026-07-05 (verify) — vérifié : revue statique OK (8/8 critères tracés dans le code), `tsc --noEmit` OK, `eslint .` OK, `next build` OK. Points contrôlés : slot `createSlot ?? createHref` (nullish, correct pour un `ReactNode`) ; auto-ouverture `?new=1` sans boucle (l'effet n'ouvre jamais en boucle car le param est nettoyé à la fermeture) ; `router.refresh()` unique (déclenché par le formulaire) ; fermeture Radix (✕/Échap/overlay) + « Annuler » → nettoient aussi `?new` ; erreur serveur laisse la modale ouverte, champs conservés ; `createUser` non modifiée et page `/admin/users/new` toujours fonctionnelle (mode page). Note non bloquante : rendu responsive jugé statiquement (preuve visuelle → backlog-test).
