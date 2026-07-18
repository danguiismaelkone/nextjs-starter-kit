---
id: ITEM-024
title: Essai gratuit et upgrade/downgrade de plan
status: implemented
priority: P1
type: feature
estimate: M
depends_on: [ITEM-021]
created: 2026-07-16
updated: 2026-07-16
---

## Idée / contexte
Pour convertir de nouveaux clients, une organisation doit pouvoir essayer la plateforme
avant de payer, puis ajuster son plan librement une fois cliente.

## User story
En tant que nouvel admin d'organisation, je veux bénéficier d'un essai gratuit puis
pouvoir changer de plan facilement, afin de tester la plateforme avant de m'engager et
d'ajuster mon abonnement à mon usage.

## Critères d'acceptation
- [x] Une nouvelle organisation démarre automatiquement en période d'essai (durée
      configurable, ex. 14 jours) sans carte bancaire requise.
- [x] À l'expiration de l'essai sans souscription, l'accès aux fonctionnalités payantes
      est restreint (pas de suppression de données). — voir note de portée ci-dessous.
- [x] Un admin peut changer de plan (upgrade immédiat, downgrade à la fin de la période
      en cours) depuis `PlanGrid`.

## Notes techniques
**Clarifié avec l'utilisateur avant implémentation** (question posée car le critère 2
suppose une zone « fonctionnalités payantes » à restreindre, qui n'existe pas encore
dans ce socle SaaS — seuls Auth/Organizations/RBAC/Billing sont livrés ; Documents,
Notifications, IA restent `todo`) : décision retenue = **fondation uniquement, pas de
blocage**. `hasActiveEntitlement(organizationId)` (`lib/billing.ts`) est la fonction
réutilisable que les futurs items à fonctionnalités payantes (Documents, IA, etc.)
devront appeler pour restreindre l'accès — même logique que `hasPermission()` construit
par ITEM-018 avant d'être câblé dans l'UI par ITEM-019. Aucune page existante n'est
bloquée par cet item.

Logique de proratisation entièrement déléguée à Stripe (`proration_behavior`), aucun
calcul manuel côté app.

Fichiers :
- `prisma/schema.prisma` (+ migration `make_subscription_plan_optional`) :
  `Subscription.planId`/`plan` rendus nullable — un essai démarre sans plan choisi
  (`onDelete: SetNull` si un `Plan` est supprimé plus tard).
- `lib/billing.ts` : `TRIAL_PERIOD_DAYS` (configurable via l'env, défaut 14),
  `startTrialSubscription()`, `hasActiveEntitlement()`.
- `lib/organization.ts` : `createOrganizationWithOwner()` (ITEM-014) démarre l'essai
  juste après le seed des rôles système — seul point de création d'organisation dans
  ce repo (`app/(auth)/register/actions.ts`), donc chaque nouvelle organisation en
  bénéficie automatiquement.
- `app/api/billing/change-plan/route.ts` : distinct de `app/api/billing/checkout`
  (ITEM-021, réservé à la toute première souscription sans abonnement Stripe
  existant). Upgrade (nouveau prix > actuel) → `stripe.subscriptions.update` avec
  `proration_behavior: "create_prorations"`, appliqué immédiatement, resynchronisé
  en local sans attendre le webhook. Downgrade (ou prix égal) → `SubscriptionSchedule`
  à deux phases (prix actuel jusqu'à la fin de période, nouveau prix ensuite,
  `proration_behavior: "none"`) — le webhook `customer.subscription.updated`
  (ITEM-022, déjà en place) synchronisera l'état local quand Stripe basculera
  effectivement la phase, sans code supplémentaire.
- `components/billing/PlanCard.tsx` / `PlanGrid.tsx` : bouton contextuel — « Souscrire »
  (pas d'abonnement Stripe actif), « Mettre à niveau » / « Rétrograder (fin de
  période) » sinon, selon comparaison de prix avec le plan actuel.
- `app/(protected)/billing/plans/page.tsx`, `components/billing/SubscriptionStatus.tsx` :
  bannière/compte à rebours d'essai (`lib/utils.ts` → `daysUntil()`, extrait en
  utilitaire pur pour éviter l'appel direct à `Date.now()` dans le corps d'un
  composant — règle ESLint `react-hooks/purity`).
- `.env.example` : `TRIAL_PERIOD_DAYS`.

## Captures attendues
Bannière d'essai en cours avec compte à rebours (page `/billing/plans` et carte
`SubscriptionStatus` sur `/billing`) ; upgrade reflété immédiatement dans
`SubscriptionStatus`/`PlanGrid` ; downgrade affichant la date d'entrée en vigueur
programmée.

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-16 (implement) — démarrage
- 2026-07-16 (implement) — question posée à l'utilisateur sur la portée du critère 2
  (pas de zone « fonctionnalités payantes » existante) → réponse : fondation
  (`hasActiveEntitlement`) sans blocage d'aucune page existante.
- 2026-07-16 (implement) — implémenté : essai gratuit à la création d'organisation,
  entitlement helper, upgrade/downgrade de plan via Stripe (proration déléguée).
  Fichiers : `prisma/schema.prisma`,
  `prisma/migrations/20260716091730_make_subscription_plan_optional/`,
  `lib/billing.ts`, `lib/organization.ts`, `lib/utils.ts`,
  `app/api/billing/change-plan/route.ts`, `components/billing/PlanCard.tsx`,
  `components/billing/PlanGrid.tsx`, `components/billing/SubscriptionStatus.tsx`,
  `app/(protected)/billing/page.tsx`, `app/(protected)/billing/plans/page.tsx`,
  `.env.example`.
- 2026-07-18 (backlog) — ITEM-094 migrera `hasActiveEntitlement()` et
  `startTrialSubscription()` pour résoudre l'owner de l'organisation
  (`Membership` role `owner`) puis sa `Subscription`, au lieu de
  `Subscription.organizationId` directement.
