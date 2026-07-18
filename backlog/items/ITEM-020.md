---
id: ITEM-020
title: Modèles Plan/Subscription/Invoice (Prisma)
status: implemented
priority: P0
type: feature
estimate: L
depends_on: [ITEM-013]
created: 2026-07-16
updated: 2026-07-16
---

## Idée / contexte
Fondation du module Billing : il faut modéliser les plans tarifaires, abonnements et
factures en base pour pouvoir synchroniser l'état de facturation avec Stripe.

## User story
En tant que plateforme, je veux modéliser les plans tarifaires, abonnements et factures
en base, afin de synchroniser l'état de facturation Stripe avec l'application.

## Critères d'acceptation
- [x] Modèles Prisma `Plan` (name, price, interval, features), `Subscription`
      (organizationId, planId, status, currentPeriodEnd, stripeSubscriptionId),
      `Invoice` (subscriptionId, amount, status, stripeInvoiceId) ajoutés.
- [x] Chaque organisation a au plus un abonnement actif à la fois.
- [x] Migration appliquée sans erreur sur la base existante.

## Notes techniques
Module `billing` (`_shared/billing.spec.json`) fournit ce schéma. Le paiement Mobile
Money du module a été retiré au profit de Stripe uniquement (contrainte stack de ce
projet) : seuls `stripePriceId`/`stripeSubscriptionId`/`stripeInvoiceId` sont prévus.

Décisions :
- `Subscription.organizationId` est `@unique` : une organisation a au plus **un**
  abonnement (le changement de plan met à jour cette même ligne au lieu d'en créer une
  nouvelle). Cela garantit "au plus un abonnement actif à la fois" par une contrainte
  d'unicité simple, sans avoir besoin d'un index partiel Postgres.
- Montants (`Plan.price`, `Invoice.amount`) stockés en entier (plus petite unité
  monétaire, ex. centimes) pour éviter les erreurs d'arrondi des flottants.
- `Plan.features` en `Json` (liste/objet libre selon le plan).
- Champs `stripePriceId` / `stripeSubscriptionId` / `stripeInvoiceId` nullable et
  uniques : posés dès maintenant pour que ITEM-021/ITEM-022 (Checkout + webhooks
  Stripe) puissent les renseigner sans nouvelle migration de schéma.

Fichiers : `prisma/schema.prisma`, `prisma/migrations/20260716080238_add_billing_plan_subscription_invoice/`.

Vérifications effectuées : `npx prisma validate`, `npx prisma migrate dev` (appliquée
sans erreur sur la base locale), `npx prisma generate`, `npx tsc --noEmit` (aucune
erreur).

## Captures attendues
N/A (fondation backend — voir ITEM-021/ITEM-023 pour l'UI).

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-16 (implement) — démarrage
- 2026-07-16 (implement) — implémenté : ajout des modèles Prisma `Plan`, `Subscription`
  (unique par organisation), `Invoice` + migration appliquée. Fichiers :
  `prisma/schema.prisma`, `prisma/migrations/20260716080238_add_billing_plan_subscription_invoice/`.
- 2026-07-18 (backlog) — ITEM-094 prévoit de migrer `Subscription` (et le
  client Stripe associé) d'un ancrage par organisation vers un ancrage par
  utilisateur owner — n'affecte pas le statut `implemented` de cet item, mais
  son schéma sera modifié par cette migration à venir.
