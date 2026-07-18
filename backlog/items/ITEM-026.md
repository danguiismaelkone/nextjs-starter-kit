---
id: ITEM-026
title: Annulation et résiliation d'abonnement
status: implemented
priority: P1
type: feature
estimate: M
depends_on: [ITEM-021]
created: 2026-07-16
updated: 2026-07-16
---

## Idée / contexte
Un abonnement doit pouvoir être résilié proprement, sans que l'utilisateur perde accès
brutalement à une période déjà payée.

## User story
En tant qu'admin d'organisation, je veux annuler mon abonnement, afin d'arrêter la
facturation quand je n'utilise plus le service.

## Critères d'acceptation
- [x] Bouton « Annuler l'abonnement » ouvre `CancelModal` avec confirmation explicite.
- [x] L'annulation prend effet à la fin de la période déjà payée (pas de remboursement
      au prorata par défaut) et est reflétée dans `SubscriptionStatus`.
- [x] L'organisation repasse en accès restreint (comme un essai expiré, ITEM-024) une
      fois la période terminée.

## Notes techniques
`CancelModal.tsx` réécrit avec `components/ui/alert-dialog` (même pattern que
`RemoveMemberButton.tsx`, `app/(protected)/admin/users/`) plutôt que copié du module
(qui utilise un simple `Dialog` + hook `useBilling` inexistants ici) — l'AlertDialog
convient mieux à une confirmation destructive explicite (critère 1).

- `app/api/billing/cancel/route.ts` : `stripe.subscriptions.update(id, {
  cancel_at_period_end: true })` — jamais `stripe.subscriptions.cancel` (annulation
  immédiate), qui couperait l'accès à une période déjà payée. Même garde de
  permission (`admin:access`) que les autres endpoints billing. Resynchronise
  immédiatement l'abonnement local via `upsertSubscriptionFromStripe` (ITEM-022), en
  secours du webhook.
- `components/billing/SubscriptionStatus.tsx` : affiche « Annulation prévue le … »
  dès que `cancelAtPeriodEnd` est vrai (critère 2) — bouton d'annulation visible
  seulement si un abonnement Stripe réel existe, n'est pas déjà résilié et n'est pas
  déjà `canceled`.
- Critère 3 (« repasse en accès restreint comme un essai expiré ») : **aucun code
  supplémentaire nécessaire**. Quand Stripe bascule effectivement l'abonnement à
  `canceled` en fin de période, le webhook `customer.subscription.updated`/`.deleted`
  (ITEM-022, déjà en place) met à jour `Subscription.status` en local, et
  `hasActiveEntitlement()` (`lib/billing.ts`, ITEM-024) renvoie déjà `false` pour le
  statut `canceled` — exactement le même chemin que l'expiration d'un essai.

Fichiers : `app/api/billing/cancel/route.ts`, `components/billing/CancelModal.tsx`,
`components/billing/SubscriptionStatus.tsx`, `app/(protected)/billing/page.tsx`.

## Captures attendues
Modale de confirmation d'annulation (AlertDialog) ; statut « Annulation prévue le … »
affiché dans `SubscriptionStatus` après confirmation.

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-16 (implement) — démarrage
- 2026-07-16 (implement) — implémenté : résiliation en fin de période (`cancel_at_period_end`),
  modale de confirmation, statut reflété dans `SubscriptionStatus`. Fichiers :
  `app/api/billing/cancel/route.ts`, `components/billing/CancelModal.tsx`,
  `components/billing/SubscriptionStatus.tsx`, `app/(protected)/billing/page.tsx`.
- 2026-07-18 (backlog) — ITEM-096 réservera l'affichage de `CancelModal` aux
  utilisateurs owner de l'abonnement (modèle par owner, ITEM-094/095) ; un
  admin non-owner ne verra plus ce bouton.
