---
id: ITEM-007
title: CRUD des utilisateurs (interface d'administration)
status: todo
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
- [ ] Page liste `/admin/users` : tableau paginé (nom, e-mail, rôle, date de création), réservé aux admins (ITEM-006).
- [ ] Recherche/filtre par e-mail ou nom sur la liste.
- [ ] Création d'un utilisateur (nom, e-mail, rôle, mot de passe initial ou invitation).
- [ ] Édition d'un utilisateur (nom, rôle) avec validation et retour d'erreur.
- [ ] Suppression (ou désactivation) d'un utilisateur avec confirmation ; un admin ne peut pas se supprimer lui-même.
- [ ] Toutes les mutations sont protégées côté serveur (pas seulement l'UI) et rejettent les non-admins.
- [ ] Les actions reflètent l'état à jour (revalidation/refresh de la liste après mutation).

## Notes techniques
- Fichiers : `app/admin/users/page.tsx`, `app/admin/users/[id]/page.tsx`, server actions ou route handlers.
- Réutiliser `requireAdmin()` (ITEM-006). Composants shadcn/ui : Table, Dialog, Form.
- Décider suppression physique vs. désactivation (`disabled`/`bannedAt`) — préférer désactivation réversible.
- Lien avec ITEM-008 : « créer » peut passer par une invitation plutôt qu'un mot de passe fixé.

## Captures attendues
Liste des utilisateurs ; formulaire de création ; édition d'un rôle ; confirmation de suppression ; liste rafraîchie après action.

## Journal
- 2026-07-04 (backlog) — créé
