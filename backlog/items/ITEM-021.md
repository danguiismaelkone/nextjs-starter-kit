---
id: ITEM-021
title: Intégration Stripe Checkout (souscription à un plan)
status: implemented
priority: P0
type: feature
estimate: L
depends_on: [ITEM-020]
created: 2026-07-16
updated: 2026-07-16
---

## Idée / contexte
Une fois le modèle de facturation posé (ITEM-020), il faut permettre à un admin
d'organisation de réellement souscrire à un plan via Stripe.

## User story
En tant qu'admin d'organisation, je veux souscrire à un plan payant via Stripe
Checkout, afin d'activer les fonctionnalités payantes pour mon organisation.

## Critères d'acceptation
- [x] Bouton « Souscrire » sur `PlanCard` redirige vers une session Stripe Checkout
      créée côté serveur (`stripe.checkout.sessions.create`).
- [x] Le `customerId` Stripe est créé et rattaché à l'organisation au premier paiement.
- [x] Page de succès/retour post-paiement affiche l'état d'abonnement mis à jour.
- [x] Clés Stripe (secret/publishable) configurées via variables d'environnement,
      jamais en dur.

## Notes techniques
Composants `PlanCard.tsx`, `PlanGrid.tsx` du module `billing` réécrits (le module de
référence est basé sur `userId` + paiement local ; adaptés ici au schéma
organisation + Stripe d'ITEM-020).

Fichiers :
- `prisma/schema.prisma` (+ migration `add_organization_stripe_customer_id`) : ajout de
  `Organization.stripeCustomerId` — nécessaire au critère 2, absent du schéma
  ITEM-020 qui ne couvrait que Plan/Subscription/Invoice.
- `lib/stripe.ts` : client Stripe paresseux (`getStripeClient()`), même pattern que
  `getResendClient()` dans `lib/email.ts` — ne plante pas le build si
  `STRIPE_SECRET_KEY` est absente, retourne `null` (l'appelant gère le cas non
  configuré).
- `app/api/billing/checkout/route.ts` : route POST — vérifie session + permission
  `admin:access` dans l'organisation active (réutilise le RBAC d'ITEM-018, cohérent
  avec « admin d'organisation » de la user story), crée le `customerId` Stripe au
  besoin (rattaché à `Organization.stripeCustomerId`), crée la session Checkout
  (`mode: "subscription"`) et retourne son URL.
- `components/billing/PlanCard.tsx` / `PlanGrid.tsx` : bouton « Souscrire » en
  Client Component — `fetch` vers la route ci-dessus puis
  `window.location.href = url` (redirection externe vers Stripe ; pas de Stripe.js
  nécessaire pour ce flux redirigé).
- `app/(protected)/billing/plans/page.tsx` : garde d'accès (session + permission
  `admin:access`), grille de plans, et synchronisation immédiate de l'abonnement
  local à la lecture du paramètre `session_id` retourné par l'URL de succès Stripe
  (`stripe.checkout.sessions.retrieve` avec `expand: ["subscription"]` puis
  `prisma.subscription.upsert`) — ne dépend pas du webhook (ITEM-022), qui prendra
  le relais pour les événements ultérieurs (renouvellements, échecs de paiement,
  factures).
- `.env.example` : `STRIPE_SECRET_KEY` (utilisée) et `STRIPE_PUBLISHABLE_KEY`
  (réservée aux futurs écrans Stripe.js côté client, ex. moyen de paiement
  ITEM-023 — pas consommée par ce flux redirigé, mais déclarée comme variable
  d'environnement plutôt qu'en dur, conformément au critère 4).

Hors périmètre (signalé plutôt qu'ajouté) : aucune donnée `Plan` n'est seedée par cet
item (pas de gestion/CRUD de plans dans le backlog actuel) — pour tester la grille en
conditions réelles, créer manuellement un `Plan` avec un `stripePriceId` Stripe valide
(mode test) avant `backlog-test`.

Vérifications effectuées : `npx prisma validate`, migration appliquée
(`migrate deploy`, non-interactif), `npx prisma generate`, `npx tsc --noEmit`,
`npx eslint` sur les fichiers modifiés, `npx next build` (routes `/billing/plans` et
`/api/billing/checkout` bien enregistrées).

## Captures attendues
Grille de plans, redirection vers Stripe Checkout (mode test), retour sur la page avec
abonnement actif affiché.

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-16 (implement) — démarrage
- 2026-07-16 (implement) — implémenté : intégration Stripe Checkout (customer +
  session), page `/billing/plans` avec synchro post-paiement, ajout
  `Organization.stripeCustomerId`. Fichiers : `prisma/schema.prisma`,
  `prisma/migrations/20260716085504_add_organization_stripe_customer_id/`,
  `lib/stripe.ts`, `app/api/billing/checkout/route.ts`,
  `app/(protected)/billing/plans/page.tsx`, `components/billing/PlanCard.tsx`,
  `components/billing/PlanGrid.tsx`, `.env.example`.
- 2026-07-18 (backlog) — ITEM-095 adaptera `app/api/billing/checkout/route.ts`
  pour résoudre le client Stripe via l'utilisateur owner
  (`User.stripeCustomerId`, ITEM-094) plutôt que via
  `organization.stripeCustomerId`.
