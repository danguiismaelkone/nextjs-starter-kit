---
id: ITEM-007
title: CRUD des utilisateurs (interface d'administration)
status: implemented
priority: P1
type: feature
estimate: L
depends_on: [ITEM-001, ITEM-006]
created: 2026-07-04
updated: 2026-07-15
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

### Décisions prises à l'implémentation
- **Désactivation réversible plutôt que suppression physique** (conforme à la préférence des notes) : champ `disabledAt DateTime?` ajouté à `User` (migration `add_user_disabled_at`). Pas de suppression physique du compte — resterait un choix hors-périmètre plus destructif et non réclamé explicitement par les critères.
- **La désactivation est réellement effective, pas juste un flag cosmétique** : `lib/auth.ts` ajoute un `databaseHooks.session.create.before` qui rejette (403 `ACCOUNT_DISABLED`) toute tentative de connexion d'un compte désactivé ; `setUserDisabledAction` révoque en plus immédiatement toutes les sessions actives de l'utilisateur (`prisma.session.deleteMany`) au moment de la désactivation, donc un utilisateur déjà connecté est déconnecté sur-le-champ, pas seulement bloqué à sa prochaine tentative de connexion. Vérifié en conditions réelles (voir Journal).
- Auto-désactivation bloquée à deux niveaux : le bouton est absent de la ligne de l'admin connecté (`DisableUserButton` avec prop `isSelf`), et `setUserDisabledAction` revérifie côté serveur (`id === session.user.id`) — défense en profondeur, cohérent avec la règle "un admin ne peut pas se supprimer lui-même" qu'on étend à la désactivation.
- **Création d'utilisateur** : passe par `auth.api.signUpEmail()` côté serveur (mot de passe initial fixé par l'admin, pas d'invitation — ITEM-008 non implémenté, hors-périmètre ici comme indiqué dans la note "Lien avec ITEM-008"). Le rôle `admin` est appliqué après coup via `prisma.user.update` (le champ `role` a `input:false` côté Better Auth, ITEM-006, donc pas assignable directement au sign-up). La session auto-créée par `signUpEmail` pour le nouveau compte est immédiatement supprimée (`session.deleteMany`) : c'est l'admin qui crée le compte, pas l'utilisateur qui se connecte — vérifié que la session de l'admin connecté n'est jamais affectée par cette création.
- **Édition** : nom + rôle uniquement (e-mail non modifiable, affiché en lecture seule) — conforme au critère qui ne liste que "nom, rôle".
- Formulaires create/edit dans un composant partagé `UserFormDialog` (`mode: "create" | "edit"`), utilisant `useActionState` (React 19) pour la gestion des erreurs de validation et l'état de soumission ; fermeture du dialog sur succès dérivée au rendu (comparaison d'identité de `state`) plutôt que via `useEffect`, pour éviter l'erreur eslint `react-hooks/set-state-in-effect` (setState synchrone dans un effet).
- Recherche via `<form method="get">` natif (aucun JS requis) sur `?q=`, pagination via liens `?page=` classiques (skip/take Prisma, 10 par page) — pas de state client, tout est dérivé de `searchParams` côté serveur.
- Toutes les mutations (`createUserAction`, `updateUserAction`, `setUserDisabledAction`) appellent `requireAdmin()` en première ligne : protection serveur indépendante de l'UI, qui masque déjà les actions aux non-admins.
- **Piège rencontré (récurrent depuis ITEM-006)** : après `prisma migrate dev` pour `disabledAt`, il a fallu relancer `prisma generate` puis redémarrer le serveur `next dev` (le Prisma Client généré n'est pas rechargé à chaud par Turbopack).
- Composants shadcn installés : `table`, `dialog`, `alert-dialog`, `select`, `badge`.
- Vérifié en conditions réelles (Playwright, admin connecté réel) : création, recherche/filtre, édition (nom + rôle avec passage user→admin), désactivation avec confirmation, bouton de désactivation absent sur sa propre ligne, pagination sur 15 utilisateurs (10 puis 5, Suivant/Précédent), erreurs de validation affichées (e-mail dupliqué, mot de passe trop court). Vérifié côté serveur (curl) : connexion d'un compte désactivé → 403 `ACCOUNT_DISABLED` ; session active révoquée immédiatement à la désactivation (cookie invalidé, `get-session` → `null`). `tsc --noEmit`, lint, `pnpm build` OK.

## Captures attendues
Liste des utilisateurs ; formulaire de création ; édition d'un rôle ; confirmation de suppression ; liste rafraîchie après action.

## Journal
- 2026-07-04 (backlog) — créé
- 2026-07-15 (implement) — démarrage
- 2026-07-15 (implement) — implémenté : page `/admin/users` (liste paginée, recherche nom/e-mail), création/édition via dialogs (`useActionState`), désactivation/réactivation avec confirmation et révocation de session immédiate, blocage de connexion pour compte désactivé (`databaseHooks.session.create.before`), auto-désactivation bloquée. Fichiers : prisma/schema.prisma, prisma/migrations/20260715093031_add_user_disabled_at, lib/auth.ts, app/(protected)/admin/users/{page.tsx,actions.ts,UserFormDialog.tsx,DisableUserButton.tsx}, components/ui/{table,dialog,alert-dialog,select,badge}.tsx. Vérifié en conditions réelles (Playwright + curl) : CRUD complet, pagination sur 15 utilisateurs, validations serveur affichées, blocage de connexion 403 pour compte désactivé, session active révoquée immédiatement. tsc/lint/build OK.
