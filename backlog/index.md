# Backlog

> Convention : voir [README.md](./README.md). Statuts : todo → in-progress → implemented → verified → tested → done (ou blocked).
> Contexte : Next.js 16 · Prisma 7 (PostgreSQL) · **Better Auth** · self-service + invitations (rôles user/admin) · **Resend**.

## Items

| ID | Titre | Type | Prio | Statut | Dépend de |
|----|-------|------|------|--------|-----------|
| [ITEM-001](items/ITEM-001.md) | Fondation d'authentification (Better Auth + Prisma) | feature | P0 | verified | — |
| [ITEM-002](items/ITEM-002.md) | Page d'enregistrement (sign-up self-service) | feature | P0 | verified | ITEM-001 |
| [ITEM-003](items/ITEM-003.md) | Page de login | feature | P0 | verified | ITEM-001 |
| [ITEM-005](items/ITEM-005.md) | Envoi d'e-mails transactionnels (Resend) | feature | P1 | verified | ITEM-001 |
| [ITEM-006](items/ITEM-006.md) | Rôles (user/admin) et contrôle d'accès | feature | P1 | verified | ITEM-001 |
| [ITEM-004](items/ITEM-004.md) | Réinitialisation du mot de passe | feature | P1 | verified | ITEM-001, ITEM-005 |
| [ITEM-007](items/ITEM-007.md) | CRUD des utilisateurs (admin) | feature | P1 | verified | ITEM-001, ITEM-006 |
| [ITEM-008](items/ITEM-008.md) | Invitation d'utilisateurs (envoi + acceptation) | feature | P2 | verified | ITEM-001, ITEM-005, ITEM-006 |
| [ITEM-009](items/ITEM-009.md) | Shell d'administration (sidebar + topbar, responsive) | feature | P1 | verified | ITEM-006 |
| [ITEM-010](items/ITEM-010.md) | Tableau de bord d'administration (stats) | feature | P1 | verified | ITEM-009, ITEM-007, ITEM-008 |
| [ITEM-012](items/ITEM-012.md) | Adopter le module DataTable (listes Utilisateurs & Invitations) | feature | P2 | verified | ITEM-007, ITEM-008 |
| [ITEM-011](items/ITEM-011.md) | Refonte des en-têtes & formulaires admin | feature | P2 | verified | ITEM-009, ITEM-007, ITEM-008 |
| [ITEM-015](items/ITEM-015.md) | Unifier Utilisateurs & Invitations en une page à onglets | feature | P2 | verified | ITEM-007, ITEM-008, ITEM-009, ITEM-012 |
| [ITEM-013](items/ITEM-013.md) | Créer un utilisateur dans une modale | feature | P2 | verified | ITEM-007, ITEM-011, ITEM-012 |
| [ITEM-014](items/ITEM-014.md) | Inviter un utilisateur dans une modale | feature | P2 | verified | ITEM-008, ITEM-011, ITEM-012, ITEM-015 |

## Prochaines actions suggérées
> Auth & user-management (ITEM-001 → 008) : **verified**. Reste à passer par `/backlog-test` pour les preuves d'exécution.

Refonte « vraie page admin » (nouveau lot) — respecter les dépendances :
1. `/backlog-implement ITEM-009`  ← shell admin (socle : sidebar + topbar), débloque 010 et 011
2. `/backlog-implement ITEM-010` (tableau de bord + statistiques, dans le shell)
3. `/backlog-implement ITEM-012` (listes via le module DataTable — tri/filtres/pagination/badges)
4. `/backlog-implement ITEM-011` (en-têtes de page + formulaires ; le tableau est couvert par 012)

Refonte navigation & formulaires (nouveau lot, socle 011 & 012 déjà `verified`) :
5. `/backlog-implement ITEM-015` (fusion en page à onglets Utilisateurs/Invitations) ← à faire avant 014
6. `/backlog-implement ITEM-013` (création d'utilisateur en modale depuis l'onglet Utilisateurs)
7. `/backlog-implement ITEM-014` (invitation en modale dans l'onglet Invitations — aligner l'ergonomie sur 013)
