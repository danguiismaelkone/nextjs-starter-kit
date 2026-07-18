---
id: ITEM-095
title: "Migration facturation : adapter Checkout/Portail/Webhooks Stripe au modèle par owner"
status: implemented
priority: P1
type: chore
estimate: M
depends_on: [ITEM-094, ITEM-021, ITEM-022, ITEM-023]
created: 2026-07-18
updated: 2026-07-18
---

## Idée / contexte
Suite d'ITEM-094 (schéma migré vers `Subscription.ownerId`/`User.stripeCustomerId`) :
les routes API qui parlent à Stripe (Checkout, Portail client, Webhooks)
résolvent aujourd'hui tout via `organization.stripeCustomerId` /
`session.metadata.organizationId` (ITEM-021/022/023) — à réécrire pour
résoudre via l'**utilisateur owner** de l'organisation active.

## User story
En tant qu'utilisateur owner, quand je clique « Souscrire »/« Mettre à
niveau »/« Gérer le moyen de paiement » depuis n'importe laquelle de mes
organisations, l'opération s'applique à **mon** abonnement (partagé entre
toutes mes organisations), pas à un abonnement propre à l'organisation
courante.

## Critères d'acceptation
- [x] `app/api/billing/checkout/route.ts` : crée/réutilise le client Stripe
      sur `session.user.id` (`User.stripeCustomerId`) au lieu de
      `organization.stripeCustomerId`. Le `metadata` de la session Stripe
      passe `ownerId` (au lieu de `organizationId`).
- [x] `app/api/billing/portal/route.ts` : résout le client Stripe via
      `session.user.id`. La garde de permission reste `admin:access` sur
      l'organisation active, **mais** n'autorise l'action que si
      `session.user.id` est bien l'`owner` de cette organisation (un
      admin non-owner ne doit plus pouvoir ouvrir le portail d'un abonnement
      qui n'est pas le sien).
- [x] `app/api/billing/change-plan/route.ts` (ITEM-024) : idem, résout
      l'abonnement de l'owner.
- [x] `app/api/webhooks/stripe/route.ts` : `checkout.session.completed` lit
      `session.metadata.ownerId` (plus `organizationId`) ;
      `lib/billing.ts` → `syncSubscriptionFromCheckoutSession`,
      `syncSubscriptionFromStripeSubscription`, `recordInvoiceFromStripe`,
      `upsertSubscriptionFromStripe` adaptés pour résoudre/mettre à jour la
      `Subscription` par `ownerId`/`stripeCustomerId` sur `User`.
- [ ] Vérifié de bout en bout (mode test Stripe) : souscription depuis
      l'organisation A d'un owner, vérification que l'abonnement résultant
      est bien visible/actif depuis l'organisation B du même owner (si
      ITEM-093 déjà livré) ou au minimum que la `Subscription` créée
      référence bien `ownerId` et pas une organisation. — non couvert ici
      (aucune interaction Stripe réelle en mode test effectuée), à faire par
      `backlog-test`.

## Notes techniques
Implémenté par nécessité pendant ITEM-094 (le schéma migré rendait ces
routes non compilables en l'état) plutôt que dans une passe séparée — voir
le Journal d'ITEM-094 pour le détail fichier par fichier. Confirmé a
posteriori que les critères ci-dessus sont satisfaits par ce travail :
- Mêmes patterns Stripe existants réutilisés (session Checkout, session
  Portail, vérification de signature webhook) — seule la **clé de
  résolution** a changé (`organizationId` → `ownerId`/`session.user.id`).
- `returnTo` (ITEM-074) inchangé — ne dépendait pas de la clé de résolution
  du customer.
- **Écart au plan initial** : pas de helper `isSubscriptionOwner(userId,
  organizationId)` séparé — chaque route a besoin de la valeur `ownerId`
  elle-même (pour la requête `Subscription`/`User` qui suit), pas seulement
  d'un booléen ; `getOrganizationOwnerId(organizationId)` (ajouté par
  ITEM-094) suivi d'une comparaison `session.user.id === ownerId` inline
  couvre le besoin sans indirection supplémentaire. Réutilisé tel quel par
  ITEM-096.

## Captures attendues
Aucune capture UI propre à cet item (routes API) — couvert par les captures
d'ITEM-096.

## Journal
- 2026-07-18 (backlog) — créé avec ITEM-094/096, suite à la décision de
  migrer la facturation vers un modèle par owner.
- 2026-07-18 (implement, via ITEM-094) — implémenté en même temps qu'ITEM-094
  (dépendance de compilation directe, voir son Journal pour le détail des
  fichiers). `pnpm exec tsc --noEmit`, `pnpm exec eslint .` et
  `pnpm exec vitest run` passent. Reste non couvert : vérification de bout en
  bout avec Stripe en mode test (aucune interaction réseau réelle
  effectuée) — laissé à `backlog-test`.
