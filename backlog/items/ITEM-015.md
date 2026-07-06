---
id: ITEM-015
title: Unifier Utilisateurs & Invitations sur une seule page à onglets (Tabs)
status: verified
priority: P2
type: feature
estimate: M
depends_on: [ITEM-007, ITEM-008, ITEM-009, ITEM-012]
created: 2026-07-05
updated: 2026-07-05
---

## Idée / contexte
Aujourd'hui la gestion des comptes est éclatée sur **deux pages** distinctes :
`/admin/users` (liste des utilisateurs) et `/admin/users/invitations` (formulaire
d'invitation + liste des invitations envoyées). L'admin doit changer de page (liens
« Invitations » / « Retour aux utilisateurs » + deux entrées de sidebar) pour passer
de l'un à l'autre. On veut **une seule page** avec deux **onglets (Tabs)** —
« Utilisateurs » et « Invitations » — où l'on navigue entre les deux vues via ces
onglets. Chaque onglet garde sa **liste avec son statut** propre qui les différencie :
utilisateurs (actif / désactivé) et invitations envoyées (en attente / acceptée /
révoquée / expirée). Item structurel : **aucune modif de logique métier** (server
actions inchangées), on réorganise la présentation et la navigation.

## User story
En tant qu'administrateur, je veux gérer les utilisateurs et les invitations depuis
une seule page à onglets, afin de basculer entre la liste des comptes et la liste des
invitations envoyées (avec leurs statuts) sans changer de page.

## Critères d'acceptation
- [x] La page `/admin/users` présente deux onglets **« Utilisateurs »** et
      **« Invitations »** ; cliquer sur un onglet affiche la liste correspondante sans
      rechargement complet de page.
- [x] L'onglet **Utilisateurs** affiche la liste des comptes existants (DataTable actuel)
      avec la colonne de **statut** actif/désactivé et les actions inchangées.
- [x] L'onglet **Invitations** affiche la **liste des invitations envoyées** avec leur
      **statut** (en attente / acceptée / révoquée / expirée) et l'action d'invitation,
      reprenant le contenu actuel de `/admin/users/invitations`.
- [x] L'onglet actif est **reflété dans l'URL** (ex. `?tab=invitations`) : un lien direct
      ou un rafraîchissement ouvre le bon onglet, et le bouton Précédent du navigateur
      fonctionne.
- [x] L'ancienne route `/admin/users/invitations` **ne casse pas** : elle redirige vers
      la page unifiée sur l'onglet Invitations (aucun lien mort — dashboard, sidebar,
      e-mails éventuels).
- [x] La **navigation admin** (sidebar `admin-nav.tsx` + raccourcis du tableau de bord)
      est mise à jour de façon cohérente avec la fusion (pas d'entrée renvoyant vers une
      page morte ; l'onglet actif reste correctement indiqué).
- [x] Responsive : les onglets et les deux listes restent lisibles et utilisables sur
      mobile.
- [x] **Non-régression** : création/désactivation d'utilisateur (ITEM-007) et
      invitation/renvoi/révocation (ITEM-008) continuent de fonctionner ; les server
      actions revalident bien la (les) route(s) désormais utilisées.

## Notes techniques
- **Primitive Tabs à ajouter** : pas de `components/ui/tabs.tsx` aujourd'hui. Créer la
  primitive shadcn/ui au-dessus de `radix-ui` (déjà en dépendance, cf.
  `components/ui/dialog.tsx` qui importe `Dialog as DialogPrimitive` depuis `radix-ui`)
  → `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`. Style `radix-nova`, base `neutral`.
- **Structure de page** : conserver une seule route serveur `/admin/users` qui fetch à la
  fois les utilisateurs et les invitations, puis rend un composant client à onglets
  (URL-sync via `?tab=` avec `useSearchParams`/`router.replace`, ou un layout à segments).
  Réutiliser tel quel `UsersTable` (`users-columns.tsx`) et `InvitationsTable`
  (`invitations-columns.tsx`) dans les `TabsContent` respectifs.
- **Redirection** : faire de `app/admin/users/invitations/page.tsx` une redirection vers
  `/admin/users?tab=invitations` (ou supprimer la page et rediriger). Vérifier
  `revalidatePath` dans `app/admin/users/invitations/actions.ts` (constante
  `INVITATIONS_PATH`) : revalider aussi `/admin/users` puisque la liste des invitations y
  vit désormais.
- **Navigation** : dans `components/admin/admin-nav.tsx`, par défaut **fusionner** en une
  seule entrée « Utilisateurs » (les onglets servent de sous-navigation) ; alternative
  acceptable : garder une entrée « Invitations » pointant vers `?tab=invitations`. Mettre
  à jour les raccourcis de `app/admin/page.tsx` en conséquence.
- **Interaction avec les modales** : cet item définit *où* vivent les listes/actions ;
  ITEM-013 (création utilisateur en modale) place son déclencheur dans l'onglet
  Utilisateurs et **ITEM-014** (invitation en modale) dans l'onglet Invitations. Faire
  ITEM-015 **avant** ITEM-014 pour éviter de retravailler l'emplacement du bouton.
- Ne pas toucher aux server actions ni à la logique d'accès (`requireAdmin`). shadcn/ui +
  Tailwind ; texte FR / code EN.

## Captures attendues
Page `/admin/users` avec les deux onglets ; onglet Utilisateurs actif (liste + statuts
actif/désactivé) ; onglet Invitations actif (invitations envoyées + statuts) ; URL
reflétant l'onglet (`?tab=invitations`) ; redirection depuis l'ancienne
`/admin/users/invitations` ; rendu mobile des onglets.

## Journal
- 2026-07-05 (backlog) — créé
- 2026-07-05 (implement) — démarrage
- 2026-07-05 (implement) — implémenté : page unique `/admin/users` à onglets (Utilisateurs / Invitations) avec compteurs, état synchronisé à l'URL `?tab=` (deep-link + Back), tables existantes réutilisées telles quelles ; ancienne route `/admin/users/invitations` → redirection ; sidebar fusionnée en une entrée « Utilisateurs » ; raccourci dashboard « Inviter » → `?tab=invitations` ; `revalidatePath` des actions d'invitation pointe désormais sur `/admin/users`. Nouvelle primitive `Tabs` (radix-ui). tsc + lint + `next build` OK. Fichiers : components/ui/tabs.tsx, components/admin/users-tabs.tsx, app/admin/users/page.tsx, app/admin/users/invitations/page.tsx, app/admin/users/invitations/actions.ts, components/admin/admin-nav.tsx, app/admin/page.tsx

## Décisions d'implémentation
- **URL-sync** : onglet contrôlé par un state local (bascule instantanée) + `router.push(?tab=)` ; un `useEffect` resynchronise depuis l'URL pour que Back/Forward et les liens directs ouvrent le bon onglet. Onglet par défaut = Utilisateurs (`?tab` absent).
- **Redirection** : `/admin/users/invitations/page.tsx` devient un simple `redirect("/admin/users?tab=invitations")` ; les **server actions** du dossier (`invitations/actions.ts`) sont conservées (importées par le formulaire et le tableau).
- **Sidebar** : fusion en une seule entrée « Utilisateurs » (les onglets font la sous-navigation), option retenue par défaut de l'item.
- **Compteurs** dans les onglets (`users.length` / `invitations.length`) pour un repère rapide.
- 2026-07-05 (verify) — vérifié : revue statique OK (8/8 critères tracés dans le code), `tsc --noEmit` OK, `eslint .` OK, `next build` OK (`/admin/users` et `/admin/users/invitations` dynamiques, pas d'erreur de boundary `useSearchParams`). Aucune server action ni logique d'accès modifiée hors la valeur de `INVITATIONS_PATH` (→ `/admin/users`, cohérent avec la nouvelle localisation) ; users actions revalident bien `/admin/users`. Notes non bloquantes : (1) chaque changement d'onglet fait un `router.push(?tab=)` → refetch RSC des deux listes (UX instantanée préservée par le state local, léger surcoût réseau) ; (2) les compteurs d'onglets reflètent les ensembles bornés (max 500/200), comportement préexistant.
