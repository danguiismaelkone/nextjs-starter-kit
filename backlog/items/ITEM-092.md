---
id: ITEM-092
title: Limite du nombre d'utilisateurs (sièges) par plan — Starter 3, Pro 5, Enterprise 10/org
status: todo
priority: P2
type: feature
estimate: M
depends_on: [ITEM-016, ITEM-020, ITEM-050, ITEM-094]
created: 2026-07-18
updated: 2026-07-18
---

## Idée / contexte
Aujourd'hui, `Plan` (`prisma/schema.prisma:335`) n'a aucun champ de limite de
sièges : `Starter` (gratuit) annonce déjà « 1 organisation » dans ses
`features` (texte libre non appliqué), mais **rien n'empêche une organisation
d'inviter un nombre illimité de membres**, quel que soit son plan (ITEM-016).
Demande explicite de l'utilisateur : plafonner le nombre d'utilisateurs par
organisation selon le plan souscrit — **Pro = 5 users**, **Enterprise = 10
users/org** (nom du plan existant, voir `prisma/seed.ts:64`, l'utilisateur a
dit « Entreprise » mais le seed utilise déjà `"Enterprise"` en anglais,
notamment vérifié par nom dans `isEnterpriseOrganization()`, `lib/billing.ts`
ITEM-066 — à réutiliser tel quel, pas de renommage) — et pouvoir
**augmenter cette limite au cas par cas depuis la console super-admin**.

## User story
En tant qu'admin d'organisation, mon nombre de membres actifs est plafonné
selon le plan souscrit, afin que la tarification reflète l'usage réel.
En tant que super-admin, je peux relever ce plafond pour une organisation
spécifique (accord commercial, cas particulier), sans changer son plan.

## Critères d'acceptation
- [ ] `Plan.maxUsers` (`Int?`, `null` = illimité) ajouté au schéma + migration ;
      seed : `Starter = 3`, `Pro = 5`, `Enterprise = 10`.
- [ ] `Organization.maxUsersOverride` (`Int?`, `null` = hérite du plan) ajouté
      au schéma + migration ; quand non `null`, **prévaut** sur `plan.maxUsers`.
- [ ] La limite effective d'une organisation se lit sur le plan de
      l'abonnement de son **owner** (ITEM-094 : `Subscription.ownerId`, plus
      `Subscription.organizationId`), pas sur un abonnement propre à
      l'organisation. Si l'owner est en essai sans plan choisi
      (`subscription.plan === null`, ITEM-024), la limite effective par
      défaut est celle du plan `Starter` (le plus bas), sauf
      `maxUsersOverride` défini sur l'organisation.
- [ ] Envoyer une invitation (ITEM-016, `app/(protected)/admin/invitations`)
      est **refusé avec un message clair** si `(membres actifs +
      invitations en attente) >= limite effective`.
- [ ] La page `/superadmin` (liste des organisations, ITEM-050) affiche
      « X / Y membres » (Y = limite effective, ou « illimité ») et propose une
      action pour qu'un super-admin modifie `maxUsersOverride` d'une
      organisation donnée.
- [ ] Vérifié : une organisation Pro à 5 membres actifs ne peut plus inviter
      tant qu'un membre n'est pas retiré ou que `maxUsersOverride` n'est pas
      relevé par un super-admin.

## Notes techniques
- `prisma/schema.prisma` : `Plan.maxUsers Int?`,
  `Organization.maxUsersOverride Int?` + migration correspondante.
- `prisma/seed.ts` : valeurs `maxUsers` des trois plans seedés (`DEFAULT_PLANS`,
  ligne 44) — `Starter = 3` est une proposition par défaut (non demandée
  explicitement par l'utilisateur, seuls Pro=5 et Enterprise=10 l'ont été) ; à
  confirmer ou ajuster librement à l'implémentation, ce n'est qu'un plan
  gratuit d'entrée.
- `lib/billing.ts` : `getSeatLimit(organizationId)` (résout l'owner de
  l'organisation, sa `Subscription`/`plan` — ITEM-094 —, puis
  `organization.maxUsersOverride ?? plan.maxUsers ?? null`, `null` =
  illimité) et `hasSeatAvailable(organizationId)` (compte `Membership` actifs
  + `Invitation` en attente), réutilisables partout où la limite doit être
  vérifiée — même logique que `hasActiveEntitlement()` (ITEM-024).
- `app/(protected)/admin/invitations/actions.ts` (action de création
  d'invitation, ITEM-016) : appelle `hasSeatAvailable` avant `prisma.invitation.create`,
  retourne une erreur exploitée par `InviteDialog.tsx` (message + désactivation
  du bouton si le compteur est déjà au plafond).
- `app/(protected)/superadmin/page.tsx` : colonne « Membres » étendue en
  « X / Y » (`Y` via `getSeatLimit`) ; nouvelle action de ligne (dialog, même
  pattern que `UserFormDialog.tsx`) appelant une Server Action dans
  `app/(protected)/superadmin/actions.ts` (`setSeatOverride(organizationId,
  value: number | null)`), réservée aux super-admins (`requireSuperAdmin()`).
- Pas de vérification côté acceptation d'invitation (`accept`) dans ce
  périmètre — la fenêtre de dépassement par une race condition (deux
  invitations acceptées simultanément au plafond) est un risque mineur,
  non traité ici ; à re-visiter si constaté en pratique.

## Captures attendues
Page `/superadmin` avec colonne « Membres » affichant « 4 / 5 » pour une
organisation Pro proche du plafond ; dialog de modification de
`maxUsersOverride` ; message de refus dans `InviteDialog` quand le plafond est
atteint.

## Journal
- 2026-07-18 (backlog) — créé, à la demande de l'utilisateur (limite de sièges
  par plan : Pro 5 users, Enterprise 10 users/org) + proposition de mécanisme
  de dérogation super-admin (`maxUsersOverride`) suite à sa question ouverte
  sur ce point. Scindé de la limite « nombre d'organisations » (ITEM-093) : ce
  dernier nécessite un nouveau flux de création d'organisation qui n'existe
  pas encore, périmètre distinct et plus large.
- 2026-07-18 (backlog) — mise à jour : ajout de la dépendance ITEM-094
  (migration de la facturation vers un modèle par owner, suite à la
  question de l'utilisateur « pourquoi ne pas gérer les plans par owner ? »).
  `Organization.maxUsersOverride` reste un champ par organisation (le
  plafond « users/org » reste par organisation même si le plan qui le
  définit est désormais celui de l'owner) — `getSeatLimit` résout l'owner
  pour trouver le plan, mais l'override reste local à l'organisation.
