---
id: ITEM-022
title: Webhooks Stripe — synchronisation des abonnements et factures
status: implemented
priority: P0
type: feature
estimate: L
depends_on: [ITEM-021]
created: 2026-07-16
updated: 2026-07-16
---

## Idée / contexte
Stripe est la source de vérité de l'état de facturation. Il faut traiter ses webhooks
pour garder la base de données locale synchronisée en toute circonstance (paiement,
échec, annulation faits directement dans Stripe ou par le client).

## User story
En tant que plateforme, je veux recevoir et traiter les webhooks Stripe, afin que le
statut d'abonnement en base reste toujours synchronisé avec Stripe.

## Critères d'acceptation
- [x] Endpoint `app/api/webhooks/stripe/route.ts` vérifie la signature Stripe et traite
      au minimum `checkout.session.completed`, `customer.subscription.updated`,
      `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`.
- [x] Chaque événement traité met à jour `Subscription`/`Invoice` en base de façon
      idempotente (rejouer un événement ne duplique rien).
- [x] Les échecs de traitement sont journalisés (voir ITEM-062) et Stripe reçoit un
      statut HTTP cohérent pour ses retries.

## Notes techniques
Endpoint public non authentifié par session — protection par vérification de signature
Stripe (`STRIPE_WEBHOOK_SECRET`) uniquement.
Fichiers : `app/api/webhooks/stripe/route.ts`, `lib/billing.ts` (nouveau — logique de
synchronisation partagée), `lib/stripe.ts`, `.env.example`.
`app/(protected)/billing/plans/page.tsx` (ITEM-021) a été mis à jour pour réutiliser
`syncSubscriptionFromCheckoutSession` de `lib/billing.ts` au lieu de sa propre copie de
la logique de synchronisation (évite la duplication avec ce webhook).

Décisions :
- Idempotence obtenue par `upsert` sur des clés uniques existantes (ITEM-020) :
  `Subscription.organizationId` (une organisation = au plus un abonnement) et
  `Invoice.stripeInvoiceId`. Rejouer le même événement écrase les mêmes valeurs sans
  créer de doublon — pas de table de déduplication d'événements nécessaire, aucun
  traitement n'est additif.
- `customer.subscription.updated/deleted` n'ont pas de `metadata.organizationId`
  (contrairement à un Checkout Session) : l'organisation est retrouvée via
  `Organization.stripeCustomerId`, et le plan via le `Price` Stripe de la ligne
  d'abonnement (`Plan.stripePriceId`). Si l'un des deux est introuvable localement,
  l'événement est ignoré silencieusement (`return` anticipé) plutôt que traité comme
  une erreur — pas un état illégitime pour un événement Stripe qui peut concerner un
  environnement/objet inconnu de cette app.
- Corps de requête lu en texte brut (`request.text()`), jamais `request.json()` :
  `stripe.webhooks.constructEvent` vérifie la signature HMAC sur les octets exacts
  envoyés par Stripe.
- Statuts HTTP : 503 si Stripe non configuré, 400 si signature absente/invalide, 500
  si le traitement d'un événement échoue (Stripe retente), 200 sinon (y compris les
  types d'événements hors périmètre, volontairement ignorés pour ne pas déclencher de
  retries inutiles).
- Journalisation des échecs via `console.error` (`TODO(ITEM-062)` posé dans le code) :
  ITEM-062 (logs structurés) n'est pas encore implémenté: à remplacer par le futur
  logger applicatif sans changer la logique de traitement.

Vérifications effectuées : `npx tsc --noEmit`, `npx eslint`, `npx next build` (route
`/api/webhooks/stripe` bien enregistrée). Signatures des types Stripe (`current_period_end`
sur `SubscriptionItem` et non `Subscription`, `Invoice.parent.subscription_details.subscription`
et non `Invoice.subscription`) vérifiées directement dans les `.d.ts` du SDK installé
(`stripe@22.3.2`) — ces champs ont changé de place par rapport aux anciennes versions
de l'API Stripe.

## Captures attendues
N/A (backend — vérifiable via les logs Stripe CLI en mode test et l'état
`Subscription`/`Invoice` en base). `backlog-test` : utiliser `stripe listen --forward-to
localhost:3000/api/webhooks/stripe` puis `stripe trigger checkout.session.completed`
(et équivalents pour les autres événements) en mode test.

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-16 (implement) — démarrage
- 2026-07-16 (implement) — implémenté : endpoint webhook Stripe (signature +
  5 événements) avec synchronisation idempotente Subscription/Invoice ; logique de
  sync partagée extraite dans `lib/billing.ts` et réutilisée par ITEM-021. Fichiers :
  `app/api/webhooks/stripe/route.ts`, `lib/billing.ts`, `.env.example`,
  `app/(protected)/billing/plans/page.tsx`.
- 2026-07-16 (implement, via ITEM-023) — `recordInvoiceFromStripe` (`lib/billing.ts`)
  renseigne désormais aussi `Invoice.invoicePdfUrl` (champ ajouté par ITEM-023 pour
  son critère « lien PDF Stripe ») — additif, ne change pas le comportement déjà
  couvert par les critères de cet item.
- 2026-07-18 (backlog) — ITEM-095 adaptera `app/api/webhooks/stripe/route.ts`
  et les fonctions `lib/billing.ts` (`syncSubscriptionFromCheckoutSession`,
  `syncSubscriptionFromStripeSubscription`, `recordInvoiceFromStripe`) pour
  résoudre par `ownerId` (ITEM-094) plutôt que par `organizationId`.
