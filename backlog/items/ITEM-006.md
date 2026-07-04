---
id: ITEM-006
title: Rôles utilisateur (user/admin) et contrôle d'accès
status: todo
priority: P1
type: feature
estimate: S
depends_on: [ITEM-001]
created: 2026-07-04
updated: 2026-07-04
---

## Idée / contexte
Le CRUD users (ITEM-007) et l'invitation (ITEM-008) doivent être réservés aux
administrateurs. Il faut un champ `role` et des garde-fous d'accès réutilisables.

## User story
En tant qu'administrateur, je veux que seules les personnes autorisées accèdent aux
fonctions d'administration, afin de protéger la gestion des utilisateurs.

## Critères d'acceptation
- [ ] Le modèle `User` possède un champ `role` (`user` par défaut, `admin`).
- [ ] Un helper serveur `requireAdmin()` (ou équivalent) protège les pages/actions admin et renvoie 403/redirection sinon.
- [ ] Un utilisateur `user` qui tente d'accéder à une route admin est bloqué (redirigé ou 403).
- [ ] Il existe un moyen documenté de promouvoir un premier admin (seed, script, ou variable d'env).
- [ ] La session/le contexte expose le rôle courant côté serveur et client.

## Notes techniques
- Fichiers : `prisma/schema.prisma` (champ role), `lib/auth.ts` (exposer role dans la session), `lib/authorization.ts`.
- Envisager le plugin `admin` de Better Auth si pertinent, sinon rôle applicatif simple.
- Hors-périmètre : permissions fines / RBAC multi-rôles (au-delà de user/admin).

## Captures attendues
Accès refusé pour un compte `user` sur une route admin ; accès autorisé pour un compte `admin`.

## Journal
- 2026-07-04 (backlog) — créé
