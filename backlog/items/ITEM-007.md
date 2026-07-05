---
id: ITEM-007
title: CRUD des utilisateurs (interface d'administration)
status: verified
priority: P1
type: feature
estimate: L
depends_on: [ITEM-001, ITEM-006]
created: 2026-07-04
updated: 2026-07-04
---

## Idée / contexte
Les administrateurs doivent pouvoir gérer les comptes : lister, consulter, créer,
modifier et supprimer/désactiver des utilisateurs. C'est le cœur « CRUD users ».

## User story
En tant qu'administrateur, je veux gérer les comptes utilisateurs (créer, lire,
modifier, supprimer), afin d'administrer qui a accès à l'application.

## Critères d'acceptation
- [x] Page liste `/admin/users` : tableau paginé (nom, e-mail, rôle, date de création), réservé aux admins (ITEM-006).
- [x] Recherche/filtre par e-mail ou nom sur la liste.
- [x] Création d'un utilisateur (nom, e-mail, rôle, mot de passe initial ou invitation).
- [x] Édition d'un utilisateur (nom, rôle) avec validation et retour d'erreur.
- [x] Suppression (ou désactivation) d'un utilisateur avec confirmation ; un admin ne peut pas se supprimer lui-même.
- [x] Toutes les mutations sont protégées côté serveur (pas seulement l'UI) et rejettent les non-admins.
- [x] Les actions reflètent l'état à jour (revalidation/refresh de la liste après mutation).

## Notes techniques
- Fichiers : `app/admin/users/page.tsx`, `app/admin/users/[id]/page.tsx`, server actions ou route handlers.
- Réutiliser `requireAdmin()` (ITEM-006). Composants shadcn/ui : Table, Dialog, Form.
- Décider suppression physique vs. désactivation (`disabled`/`bannedAt`) — préférer désactivation réversible.
- Lien avec ITEM-008 : « créer » peut passer par une invitation plutôt qu'un mot de passe fixé.

### Décisions prises
- **Désactivation réversible retenue** (pas de suppression physique) : nouveau champ
  `User.disabledAt DateTime?`. Un compte désactivé est verrouillé côté app dans
  `getCurrentUser()` (traité comme non authentifié) et ses sessions sont révoquées
  à la désactivation. `disabledAt` exposé dans la session via `additionalFields`
  (`input: false`). Migration `20260704031710_add_user_disabled_at`.
- **Pas de plugin `admin` Better Auth** : cohérent avec ITEM-006 (rôle applicatif).
  Création via `auth.api.signUpEmail` (hash + compte credential corrects), puis
  application du rôle et révocation de la session auto-créée ; l'admin reste connecté.
- **Pages dédiées** plutôt que Dialog : `/admin/users` (liste + recherche GET +
  pagination), `/admin/users/new` (création), `/admin/users/[id]` (édition +
  activer/désactiver). Confirmation via `window.confirm` (pas d'AlertDialog à ajouter).
- **Mutations = server actions** (`app/admin/users/actions.ts`), chacune protégée par
  `requireAdminOrThrow()` (rejet 401/403 des non-admins, indépendamment de l'UI).
  Résultat typé `ActionResult` + `revalidatePath` ; les formulaires font `router.refresh()`.
- **Validation partagée** `lib/user-validation.ts` (réutilisée client + serveur).
  Petit `<Select>` natif ajouté (`components/ui/select.tsx`) pour le rôle.
- Auto-protection : un admin ne peut pas se désactiver lui-même (contrôle côté
  serveur dans `setUserDisabled` + bouton désactivé dans l'UI).
- **Hors-périmètre / à surveiller** : pas de garde « dernier admin » (un admin peut
  rétrograder/désactiver le dernier autre admin) ; l'invitation à la création relève d'ITEM-008.

## Captures attendues
- Liste `/admin/users` paginée (colonnes nom, e-mail, rôle, statut, date) — accès admin.
- Recherche par nom/e-mail filtrant la liste.
- Formulaire de création `/admin/users/new` (rôle sélectionnable) puis nouvel utilisateur visible dans la liste.
- Édition d'un rôle sur `/admin/users/[id]` avec message de confirmation ; erreur de validation (nom vide).
- Confirmation puis désactivation d'un compte → statut « Désactivé » dans la liste rafraîchie ; bouton de désactivation grisé sur son propre compte.
- (Contrôle serveur) un compte `user` sur `/admin/users` est redirigé (ITEM-006).

## Journal
- 2026-07-04 (backlog) — créé
- 2026-07-04 (implement) — démarrage
- 2026-07-04 (implement) — implémenté : CRUD admin des utilisateurs (liste paginée + recherche, création, édition nom/rôle, désactivation réversible), mutations en server actions protégées par requireAdminOrThrow, désactivation enforcée dans getCurrentUser. Fichiers : prisma/schema.prisma, lib/auth.ts, lib/authorization.ts, lib/user-validation.ts, app/admin/page.tsx, app/admin/users/page.tsx, app/admin/users/new/page.tsx, app/admin/users/[id]/page.tsx, app/admin/users/actions.ts, components/admin/user-create-form.tsx, components/admin/user-edit-form.tsx, components/admin/disable-user-button.tsx, components/ui/select.tsx, prisma/migrations/20260704031710_add_user_disabled_at/
- 2026-07-04 (verify) — vérifié : revue OK (7/7 critères couverts), lint/types/build OK. Non bloquant : pas de garde « dernier admin » ni contre l'auto-rétrogradation (updateUser) ; toute APIError de signUpEmail mappée en « e-mail déjà utilisé » (actions.ts:57).
