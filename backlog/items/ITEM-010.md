---
id: ITEM-010
title: Tableau de bord d'administration (vue d'ensemble + statistiques)
status: verified
priority: P1
type: feature
estimate: M
depends_on: [ITEM-009, ITEM-007, ITEM-008]
created: 2026-07-04
updated: 2026-07-05
---

## Idée / contexte
La page `/admin` n'affiche qu'une carte « Bienvenue ». Une vraie console d'admin
présente une **vue d'ensemble** : indicateurs clés et raccourcis. Cet item
transforme `/admin` en tableau de bord au sein du shell (ITEM-009), en s'appuyant
sur les données déjà disponibles (utilisateurs — ITEM-007, invitations — ITEM-008).

## User story
En tant qu'administrateur, je veux un tableau de bord avec les chiffres clés et
des accès rapides, afin d'avoir une vision immédiate de l'état des comptes et
d'aller vite vers les actions courantes.

## Critères d'acceptation
- [x] `/admin` affiche des **cartes de statistiques** : nombre total d'utilisateurs, nombre d'admins, comptes désactivés, invitations en attente.
- [x] Les chiffres sont calculés côté serveur à partir de la base (Prisma), pas codés en dur.
- [x] Des **raccourcis** mènent aux actions clés (ex. « Nouvel utilisateur », « Inviter », « Voir les utilisateurs »).
- [x] Une liste des **derniers utilisateurs créés** (ex. 5) est affichée avec nom, e-mail, rôle, statut.
- [x] La page reste réservée aux admins (via le shell/`requireAdmin`) et gère le cas « aucune donnée » proprement.
- [x] Le rendu est cohérent avec le shell (ITEM-009) et responsive (cartes en grille qui se réorganisent sur mobile).

## Notes techniques
- Fichiers : `app/admin/page.tsx` (remplacer la carte actuelle), éventuel
  `components/admin/stat-card.tsx` réutilisable.
- Requêtes : `prisma.user.count()`, `count({ where: { role: "admin" } })`,
  `count({ where: { disabledAt: { not: null } } })`,
  `prisma.invitation.count({ where: { status: "pending" } })` (attention aux
  invitations expirées : « en attente » = `status: pending` ET `expiresAt > now`,
  réutiliser la logique d'ITEM-008 si pertinent). Paralléliser via `Promise.all`.
- Réutiliser `Card`/`Button` existants ; garder texte FR / code EN.
- Hors-périmètre : graphiques/temporel (séries, courbes), export, filtres avancés.

## Captures attendues
Tableau de bord `/admin` avec les cartes de statistiques renseignées, les
raccourcis, et la liste des derniers utilisateurs ; version mobile (cartes
empilées).

## Journal
- 2026-07-04 (backlog) — créé
- 2026-07-05 (implement) — démarrage
- 2026-07-05 (implement) — implémenté : dashboard `/admin` (4 cartes stats via Promise.all, raccourcis, 5 derniers utilisateurs, cas vide, responsive). Fichiers : app/admin/page.tsx, components/admin/stat-card.tsx
- 2026-07-05 (verify) — vérifié : revue OK (6/6 critères), types OK, lint OK, build OK. Règle « invitations en attente » alignée sur ITEM-008.
