---
id: ITEM-008
title: Invitation d'utilisateurs (envoi + acceptation)
status: todo
priority: P2
type: feature
estimate: M
depends_on: [ITEM-001, ITEM-005, ITEM-006]
created: 2026-07-04
updated: 2026-07-04
---

## Idée / contexte
En plus de l'inscription self-service, un administrateur doit pouvoir inviter une
personne par e-mail. L'invité reçoit un lien pour définir son mot de passe et
rejoindre l'application avec le rôle attribué.

## User story
En tant qu'administrateur, je veux inviter un utilisateur par e-mail, afin qu'il
crée son compte lui-même via un lien sécurisé sans que je fixe son mot de passe.

## Critères d'acceptation
- [ ] Depuis l'admin (ITEM-007), un formulaire « Inviter » saisit e-mail + rôle et déclenche une invitation.
- [ ] Une invitation tokenisée est persistée (statut `pending`, expiration) et un e-mail est envoyé via Resend (ITEM-005).
- [ ] Route `/invite/accept?token=...` : valide le token, laisse l'invité définir son mot de passe (et nom si absent).
- [ ] À l'acceptation, le compte est créé/activé avec le rôle prévu et l'invitation passe à `accepted`.
- [ ] Token invalide, expiré ou déjà utilisé → message d'erreur clair, pas de compte créé.
- [ ] Un admin peut voir les invitations en attente et en renvoyer/révoquer une.
- [ ] Seuls les admins peuvent émettre des invitations (protection serveur, ITEM-006).

## Notes techniques
- Fichiers : modèle `Invitation` dans Prisma, `app/invite/accept/page.tsx`, server actions d'invitation.
- Utiliser le plugin d'invitation/organisation de Better Auth si adapté, sinon table `Invitation` custom + flux de reset-like.
- Réutiliser `sendInvitationEmail()` d'ITEM-005.
- Hors-périmètre : invitations multi-organisations / équipes (rester sur un seul espace).

## Captures attendues
Formulaire d'invitation ; e-mail/lien d'invitation (ou log dev) ; page d'acceptation ; nouveau compte visible dans la liste admin avec le bon rôle ; invitation marquée acceptée.

## Journal
- 2026-07-04 (backlog) — créé
