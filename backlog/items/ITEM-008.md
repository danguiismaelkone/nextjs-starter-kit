---
id: ITEM-008
title: Invitation d'utilisateurs (envoi + acceptation)
status: verified
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
- [x] Depuis l'admin (ITEM-007), un formulaire « Inviter » saisit e-mail + rôle et déclenche une invitation.
- [x] Une invitation tokenisée est persistée (statut `pending`, expiration) et un e-mail est envoyé via Resend (ITEM-005).
- [x] Route `/invite/accept?token=...` : valide le token, laisse l'invité définir son mot de passe (et nom si absent).
- [x] À l'acceptation, le compte est créé/activé avec le rôle prévu et l'invitation passe à `accepted`.
- [x] Token invalide, expiré ou déjà utilisé → message d'erreur clair, pas de compte créé.
- [x] Un admin peut voir les invitations en attente et en renvoyer/révoquer une.
- [x] Seuls les admins peuvent émettre des invitations (protection serveur, ITEM-006).

## Notes techniques
- Fichiers : modèle `Invitation` dans Prisma, `app/invite/accept/page.tsx`, server actions d'invitation.
- Utiliser le plugin d'invitation/organisation de Better Auth si adapté, sinon table `Invitation` custom + flux de reset-like.
- Réutiliser `sendInvitationEmail()` d'ITEM-005.
- Hors-périmètre : invitations multi-organisations / équipes (rester sur un seul espace).

### Décisions prises
- **Table `Invitation` custom** (pas le plugin org/admin de Better Auth) : cohérent
  avec le rôle applicatif d'ITEM-006/007 et le périmètre « un seul espace ». Champs :
  `email, role, token (unique), status (pending|accepted|revoked), expiresAt,
  invitedBy, acceptedAt`. Migration `20260704032413_add_invitation`.
- **Flux reset-like** : token aléatoire (`randomBytes(32)`), TTL 7 j, URL
  `${BETTER_AUTH_URL}/invite/accept?token=…`. Helpers centralisés dans `lib/invitation.ts`
  (`generateInvitationToken`, `invitationExpiry`, `buildInvitationUrl`,
  `invitationInvalidReason` — source unique de vérité de validité, partagée page + action).
- **Sécurité e-mail** : à l'acceptation, l'e-mail vient **du token** (jamais du client),
  donc un token valide ne peut pas être détourné vers une autre adresse.
- **Création de compte** via `auth.api.signUpEmail` (hash + compte credential),
  puis application du rôle et passage de l'invitation à `accepted` (dans une
  transaction, update conditionnel `status=pending` → anti double-usage). La session
  auto-créée est supprimée ; l'invité est ensuite connecté côté client
  (`signIn.email`) puis redirigé vers `/dashboard`.
- **Admin** : page `/admin/users/invitations` (form « Inviter » + liste 50 dernières,
  statut Acceptée/Révoquée/Expirée/En attente) ; actions **Renvoyer** (rotation du token
  + prolongation) et **Révoquer**. Une seule invitation active par e-mail (les `pending`
  précédentes sont révoquées). Lien depuis `/admin/users`.
- **Protection serveur** : `createInvitation`/`revokeInvitation`/`resendInvitation`
  gardées par `requireAdminOrThrow()` ; `acceptInvitation` est volontairement publique
  (invité anonyme) et ne fait confiance qu'au token.
- **Hors-périmètre / à surveiller** : nettoyage/expiration automatique des invitations
  non implémenté (le statut « Expirée » est dérivé de `expiresAt`, pas de purge) ;
  invitation d'un e-mail déjà inscrit refusée (« un compte existe déjà »).

## Captures attendues
- Formulaire « Inviter » (`/admin/users/invitations`) + message de confirmation d'envoi.
- Lien d'invitation (log console dev si `RESEND_API_KEY` absent — voir ITEM-005).
- Page d'acceptation `/invite/accept?token=…` (nom + mot de passe) puis redirection `/dashboard` connecté.
- Nouveau compte visible dans la liste `/admin/users` avec le rôle prévu ; invitation passée à « Acceptée ».
- Token invalide/expiré/révoqué → page « Invitation invalide » (aucun compte créé).
- Renvoi et révocation d'une invitation en attente depuis la liste.

## Journal
- 2026-07-04 (backlog) — créé
- 2026-07-04 (implement) — démarrage
- 2026-07-04 (implement) — implémenté : table Invitation + flux d'invitation tokenisé (envoi Resend, acceptation avec création de compte + rôle, gestion pending/accepted/revoked/expired), UI admin (inviter/renvoyer/révoquer) et page d'acceptation publique. Fichiers : prisma/schema.prisma, lib/invitation.ts, app/admin/users/invitations/actions.ts, app/admin/users/invitations/page.tsx, app/invite/accept/actions.ts, app/invite/accept/page.tsx, components/admin/invitation-create-form.tsx, components/admin/invitation-row-actions.tsx, components/invite/accept-invitation-form.tsx, app/admin/users/page.tsx, prisma/migrations/20260704032413_add_invitation/
- 2026-07-04 (verify) — vérifié : revue OK (7/7 critères couverts), lint/types/build OK. Non bloquant : createInvitation renvoie ok même si l'envoi Resend échoue en prod (invitation persistée, renvoi possible) ; pas de purge des invitations expirées (hors-périmètre).
