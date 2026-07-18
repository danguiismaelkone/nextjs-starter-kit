---
id: ITEM-093
title: Limite du nombre d'organisations par propriétaire selon le plan — Starter/Pro 1, Enterprise 3
status: todo
priority: P2
type: feature
estimate: M
depends_on: [ITEM-013, ITEM-014, ITEM-092, ITEM-094]
created: 2026-07-18
updated: 2026-07-18
---

## Idée / contexte
Demande explicite de l'utilisateur : plafonner le nombre d'organisations
qu'un utilisateur peut posséder selon son plan — **Pro = 1 org**,
**Enterprise = 3 orgs**. Constat important en explorant le code existant :
`createOrganizationWithOwner()` (`lib/organization.ts:223`) n'est aujourd'hui
appelée que depuis **un seul endroit**, `/onboarding` (inscription,
ITEM-014) — **il n'existe aucun flux permettant à un utilisateur déjà
inscrit de créer une seconde organisation** (`OrgSwitcher.tsx` ne propose pas
d'action « créer une organisation »). Le plafond « Pro = 1 org » correspond
donc déjà au comportement actuel par défaut ; le vrai travail de cet item est
**Enterprise = jusqu'à 3 orgs**, ce qui suppose de construire ce flux de
création avant de pouvoir le plafonner.

**Mise à jour de conception (2026-07-18)** : cet item s'appuie désormais sur
ITEM-094 (migration de `Subscription` vers un modèle **par owner** plutôt que
par organisation, suite à la question de l'utilisateur « pourquoi ne pas
gérer les plans par owner ? »). Un owner n'a **qu'un seul abonnement/plan**,
qui couvre déjà toutes ses organisations — la limite `maxOrgsPerOwner` se lit
donc **directement sur le plan de cet abonnement unique**, sans plus avoir à
calculer un maximum entre plusieurs organisations déjà possédées (c'était la
version initiale de cet item, avant la décision de migration ; conservée
uniquement à titre d'historique dans le Journal).

## User story
En tant qu'utilisateur déjà propriétaire d'au moins une organisation, je veux
pouvoir en créer une nouvelle depuis l'application (pas seulement à
l'inscription), dans la limite permise par mon plan. En tant que
super-admin, je peux relever cette limite pour un utilisateur donné (accord
commercial, cas particulier).

## Critères d'acceptation
- [ ] `Plan.maxOrgsPerOwner` (`Int?`, `null` = illimité) ajouté au schéma +
      migration ; seed : `Starter = 1`, `Pro = 1`, `Enterprise = 3`.
- [ ] `User.maxOrgsOverride` (`Int?`, `null` = calculé depuis le plan) ajouté
      au schéma + migration ; quand non `null`, **prévaut** sur le plan.
- [ ] Limite effective pour un utilisateur = `maxOrgsOverride ?? subscription?.plan?.maxOrgsPerOwner
      ?? 1` (pas d'abonnement/essai sans plan choisi → limite par défaut 1,
      comportement actuel inchangé).
- [ ] Nouveau point d'entrée « Créer une organisation » accessible à un
      utilisateur déjà connecté et déjà owner d'au moins une organisation
      (ex. depuis `OrgSwitcher.tsx`), absent aujourd'hui.
- [ ] La création est **refusée avec un message clair** (et une piste
      d'action : upgrade vers Enterprise) si le nombre d'organisations actives
      dont l'utilisateur est déjà `owner` atteint la limite effective.
- [ ] La page `/superadmin/users` (ITEM-050) permet à un super-admin de
      modifier `maxOrgsOverride` pour un utilisateur donné.
- [ ] Vérifié : un owner Pro (limite 1) ne peut pas créer de 2e organisation ;
      un owner Enterprise (limite 3) le peut jusqu'à 3, et son plan unique
      s'applique bien aux 3 organisations ; le message de refus s'affiche
      correctement au-delà.

## Notes techniques
- `prisma/schema.prisma` : `Plan.maxOrgsPerOwner Int?`,
  `User.maxOrgsOverride Int?` + migration (idéalement dans la continuité de
  celle d'ITEM-092, mêmes tables `Plan`/nouveaux champs).
- `prisma/seed.ts` : valeurs `maxOrgsPerOwner` des trois plans (`Starter = 1`,
  `Pro = 1`, `Enterprise = 3` — ces deux dernières explicitement demandées par
  l'utilisateur).
- `lib/organization.ts` : nouvelle fonction `canCreateAdditionalOrganization(userId)`
  — lit `User.maxOrgsOverride` puis, à défaut, le `Plan.maxOrgsPerOwner` de la
  `Subscription` de l'utilisateur (ITEM-094, `Subscription.ownerId`), compare
  au nombre de `Membership` où `role: "owner"`, `status: "active"`. Appelée
  avant `createOrganizationWithOwner()` par le nouveau flux (pas par
  `/onboarding`, qui reste réservé à la toute première organisation et n'est
  jamais bloqué par cet item).
- Nouveau flux de création : réutiliser l'UI/logique de l'étape « organisation »
  de l'assistant d'inscription (`app/onboarding/actions.ts`,
  `components/onboarding/OnboardingWizard.tsx`, ITEM-073) plutôt que la
  dupliquer — factoriser si besoin. Nouvelle route (ex.
  `app/(protected)/organizations/new/page.tsx`) + entrée « + Créer une
  organisation » dans `components/layout/OrgSwitcher.tsx`.
- `app/(protected)/superadmin/users/page.tsx` (+ `actions.ts`) : action de
  modification de `maxOrgsOverride`, même pattern que `setSeatOverride`
  d'ITEM-092, réservée aux super-admins.
- Après création, l'utilisateur devient `owner` de la nouvelle organisation ;
  celle-ci **n'a pas sa propre `Subscription`** (ITEM-094 : l'abonnement est
  celui de l'owner, déjà existant) — juste un nouveau `Membership` role
  `owner`. `createOrganizationWithOwner()` ne doit donc plus appeler
  `startTrialSubscription()` pour une organisation créée par ce flux si
  l'owner a déjà un abonnement actif (seule la toute première organisation,
  via `/onboarding`, démarre un essai).

## Captures attendues
Entrée « Créer une organisation » dans `OrgSwitcher` pour un owner Enterprise
sous la limite ; message de refus explicite pour un owner Pro tentant une 2e
organisation ; page `/superadmin/users` avec le contrôle de
`maxOrgsOverride`.

## Journal
- 2026-07-18 (backlog) — créé, à la demande de l'utilisateur (limite
  d'organisations par plan : Pro 1, Enterprise 3). Clarifié avec l'utilisateur
  avant rédaction : plafond par propriétaire (chaque org facturée
  indépendamment) plutôt qu'un compte facturé unique multi-organisations,
  pour rester dans un périmètre S/M cohérent avec le modèle `Subscription`
  1:1 déjà en place. Scindé d'ITEM-092 (limite de sièges) car ce dernier est
  applicable immédiatement (flux d'invitation déjà existant), alors que
  celui-ci nécessite d'abord de construire un flux de création
  d'organisation absent du produit aujourd'hui.
- 2026-07-18 (backlog) — mise à jour : l'utilisateur a remis en question ce
  premier découpage (« pourquoi tu ne gères pas les plans par user owner ? »)
  et a choisi de migrer vers un modèle de facturation par owner (ITEM-094/
  095/096) plutôt que de garder le contournement « max des plans des
  organisations déjà possédées ». Critères et notes techniques réécrits en
  conséquence ; `depends_on` désormais `ITEM-094`. Priorité relevée P3 → P2
  (dépend maintenant d'un socle P1 déjà nécessaire pour la cohérence globale
  de la facturation, plus seulement une fonctionnalité secondaire isolée).
