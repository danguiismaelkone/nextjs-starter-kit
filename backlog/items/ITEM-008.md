---
id: ITEM-008
title: Invitation d'utilisateurs (envoi + acceptation)
status: implemented
priority: P2
type: feature
estimate: M
depends_on: [ITEM-001, ITEM-005, ITEM-006]
created: 2026-07-04
updated: 2026-07-15
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

### Décisions prises à l'implémentation
- **Table `Invitation` custom** plutôt que le plugin organisation de Better Auth : ce plugin est pensé pour du multi-tenant (explicitement hors-périmètre ici, cf. ITEM-009/ITEM-010 qui ont déjà écarté le multi-tenant). Modèle simple : `email`, `role`, `token` (unique, généré via `crypto.randomBytes(24).toString("hex")`), `status` (`pending`/`accepted`/`revoked`), `expiresAt` (7 jours). Migration `add_invitation`.
- **Acceptation = flux client identique à `/register`**, pas un server action pur : la page `/invite/accept` (Server Component) valide le token côté serveur et affiche soit le formulaire soit un état "invalide/expiré", puis le composant client `AcceptInvitationForm` appelle `authClient.signUp.email()` (comme le register — pose correctement le cookie de session via le vrai round-trip HTTP), puis un server action `acceptInvitationAction(token)` qui applique le rôle de l'invitation et passe son statut à `accepted`. Ce découpage était nécessaire car un appel serveur direct à `auth.api.signUpEmail()` (utilisé côté admin dans ITEM-007) ne pose pas de cookie sur le navigateur de l'appelant — ici on veut au contraire que l'invité soit connecté après coup.
- Le rôle n'est pas assignable au moment du `signUp` (champ `role` en `input:false`, ITEM-006) : appliqué après coup par `acceptInvitationAction` via `prisma.user.update`, dans la même transaction que le passage de l'invitation à `accepted`.
- **Renvoyer** régénère un nouveau token + une nouvelle expiration et renvoie l'e-mail (l'ancien lien devient caduc) plutôt que de renvoyer le même token tel quel.
- **Doublons évités** : refus de créer une invitation si un compte existe déjà pour l'e-mail, ou si une invitation `pending` existe déjà pour cet e-mail (message renvoyant vers "Renvoyer").
- UI : page dédiée `/admin/invitations` (liste + dialog "Inviter" + actions Renvoyer/Révoquer par ligne), reliée à `/admin/users` par des liens croisés dans les deux sens, et ajoutée à la nav admin de la sidebar (`components/layout/AppSidebar.tsx`). Actions (Renvoyer/Révoquer) affichées uniquement sur les invitations `pending` — une fois acceptée/révoquée, plus aucune action (juste le badge de statut).
- Composants shadcn réutilisés (aucun nouveau composant UI nécessaire, tous déjà installés en ITEM-007 : `table`, `dialog`, `alert-dialog`, `select`, `badge`).
- Vérifié en conditions réelles (Playwright, admin réel + fenêtre non authentifiée) : invitation créée → visible avec statut "En attente" ; doublon bloqué avec message clair ; token récupéré en base et utilisé pour accepter — compte créé, rôle "admin" bien appliqué, connexion automatique, section Administration visible après coup ; réutilisation du même lien → "Invitation invalide" ; token bidon → idem ; renvoi (nouveau token généré, ancien caduc) ; révocation → statut "Révoquée", lien (même renvoyé) définitivement inutilisable. `tsc --noEmit`, lint, `pnpm build` OK.

## Captures attendues
Formulaire d'invitation ; e-mail/lien d'invitation (ou log dev) ; page d'acceptation ; nouveau compte visible dans la liste admin avec le bon rôle ; invitation marquée acceptée.

## Journal
- 2026-07-04 (backlog) — créé
- 2026-07-15 (implement) — démarrage
- 2026-07-15 (implement) — implémenté : modèle `Invitation`, page `/admin/invitations` (créer/renvoyer/révoquer, protégée par `requireAdmin()`), route publique `/invite/accept` (validation token + création de compte + application du rôle), e-mail envoyé via `sendInvitationEmail` (ITEM-005). Fichiers : prisma/schema.prisma, prisma/migrations/20260715094020_add_invitation, app/(protected)/admin/invitations/{page.tsx,actions.ts,InviteDialog.tsx,InvitationRowActions.tsx}, app/invite/accept/{page.tsx,actions.ts,AcceptInvitationForm.tsx}, app/(protected)/admin/users/page.tsx (lien croisé), components/layout/AppSidebar.tsx (nav). Vérifié en conditions réelles (Playwright + DB) : cycle complet invitation → acceptation → rôle appliqué → connexion auto ; doublon, lien réutilisé, token bogus et invitation révoquée tous rejetés proprement ; renvoi régénère le token. tsc/lint/build OK.
