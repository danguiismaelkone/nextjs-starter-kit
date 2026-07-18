---
id: ITEM-025
title: Coupons et codes promo
status: implemented
priority: P2
type: feature
estimate: S
depends_on: [ITEM-021]
created: 2026-07-16
updated: 2026-07-16
---

## Idée / contexte
Pour des campagnes commerciales, il faut pouvoir appliquer une remise à la souscription
sans construire un moteur de promotion custom.

## User story
En tant qu'admin plateforme, je veux créer et appliquer des codes promo, afin de
proposer des offres commerciales.

## Critères d'acceptation
- [x] Un champ « code promo » sur la page de souscription applique un coupon Stripe
      existant (`stripe.coupons`/`promotion_codes`) à la session Checkout.
- [x] Un code invalide ou expiré affiche un message d'erreur clair sans bloquer la
      souscription au tarif plein.

## Notes techniques
Implémenté avec `allow_promotion_codes: true` sur `stripe.checkout.sessions.create`
(`app/api/billing/checkout/route.ts`) plutôt qu'un champ custom sur
`app/(protected)/billing/plans/page.tsx` : Stripe Checkout affiche nativement le champ
« code promo » sur sa propre page hébergée (« la page de souscription » de la user
story, puisque le flux redirige vers Stripe et ne réimplémente pas de formulaire de
paiement en interne), avec validation, message d'erreur inline et non-blocage de la
souscription au tarif plein déjà gérés par Stripe — exactement ce que demandent les
deux critères, sans aucune logique de coupon dupliquée côté app (conforme à la note
technique d'origine). Ajouter un second champ promo sur notre propre page aurait
dupliqué l'UI Stripe pour rien.

`app/(protected)/billing/plans/page.tsx` n'a donc pas été modifié pour cet item — la
remise appliquée par Stripe se répercute automatiquement dans les montants
(`Invoice.amount`) déjà lus depuis Stripe par `lib/billing.ts` (ITEM-022/023), sans
changement nécessaire là non plus.

Fichiers : `app/api/billing/checkout/route.ts`.

## Captures attendues
Sur la page Stripe Checkout (mode test) : champ « Ajouter un code promo » visible,
prix mis à jour après application d'un coupon valide ; message d'erreur clair pour un
code invalide, sans blocage de la souscription au tarif plein.

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-16 (implement) — démarrage
- 2026-07-16 (implement) — implémenté : `allow_promotion_codes: true` sur la session
  Stripe Checkout, champ promo natif de la page Stripe hébergée. Fichiers :
  `app/api/billing/checkout/route.ts`.
