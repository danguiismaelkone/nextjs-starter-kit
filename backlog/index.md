# Backlog

> Convention : voir [README.md](./README.md). Statuts : todo → in-progress → implemented → verified → tested → done (ou blocked).
> Contexte : Next.js 16 · Prisma 7 (PostgreSQL) · **Better Auth** · self-service + invitations (rôles user/admin) · **Resend**.

## Items

| ID | Titre | Type | Prio | Statut | Dépend de |
|----|-------|------|------|--------|-----------|
| [ITEM-001](items/ITEM-001.md) | Fondation d'authentification (Better Auth + Prisma) | feature | P0 | todo | — |
| [ITEM-002](items/ITEM-002.md) | Page d'enregistrement (sign-up self-service) | feature | P0 | todo | ITEM-001 |
| [ITEM-003](items/ITEM-003.md) | Page de login | feature | P0 | todo | ITEM-001 |
| [ITEM-005](items/ITEM-005.md) | Envoi d'e-mails transactionnels (Resend) | feature | P1 | todo | ITEM-001 |
| [ITEM-006](items/ITEM-006.md) | Rôles (user/admin) et contrôle d'accès | feature | P1 | todo | ITEM-001 |
| [ITEM-004](items/ITEM-004.md) | Réinitialisation du mot de passe | feature | P1 | todo | ITEM-001, ITEM-005 |
| [ITEM-007](items/ITEM-007.md) | CRUD des utilisateurs (admin) | feature | P1 | todo | ITEM-001, ITEM-006 |
| [ITEM-008](items/ITEM-008.md) | Invitation d'utilisateurs (envoi + acceptation) | feature | P2 | todo | ITEM-001, ITEM-005, ITEM-006 |

## Prochaines actions suggérées
1. `/backlog-implement ITEM-001`  ← fondation, débloque tout le reste
2. `/backlog-implement ITEM-002` et `/backlog-implement ITEM-003` (login/register, en parallèle)
3. `/backlog-implement ITEM-005` puis `/backlog-implement ITEM-006` (e-mail & rôles)
4. `/backlog-implement ITEM-004` (reset — a besoin de 005)
5. `/backlog-implement ITEM-007` puis `/backlog-implement ITEM-008` (CRUD & invitations)
