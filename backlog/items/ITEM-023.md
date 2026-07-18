---
id: ITEM-023
title: Page Facturation (plan actuel, factures, moyen de paiement)
status: implemented
priority: P1
type: feature
estimate: M
depends_on: [ITEM-021]
created: 2026-07-16
updated: 2026-07-16
---

## Idée / contexte
Une fois la souscription possible (ITEM-021), les admins d'organisation ont besoin
d'une page pour suivre leur abonnement et leurs factures au quotidien.

## User story
En tant qu'admin d'organisation, je veux voir mon plan actuel, mon historique de
factures et gérer mon moyen de paiement, afin de suivre et contrôler mes dépenses.

## Critères d'acceptation
- [x] Page `/billing` affiche `SubscriptionStatus` (plan, statut, date de
      renouvellement) et un lien vers le portail client Stripe (gestion moyen de
      paiement).
- [x] Page `/billing/invoices` liste les factures via `TransactionTable` (montant,
      date, statut, lien PDF Stripe).
- [x] Accessible uniquement aux rôles `owner`/`admin` de l'organisation.

## Notes techniques
Composants du module `billing` (`SubscriptionStatus.tsx`, `TransactionTable.tsx`)
réécrits plutôt que copiés tels quels : la version du module dépend d'un
`CancelModal` (hors périmètre — ITEM-026) et d'un composant `DataTable` générique
qui n'existe pas encore dans ce repo (module `datatable` non installé, réservé à
ITEM-019/050/061). `TransactionTable` est ici une table `components/ui/table`
directe, dans le même style que `app/(protected)/admin/users/page.tsx`.

Fichiers :
- `prisma/schema.prisma` (+ migration `add_invoice_pdf_url`) : ajout de
  `Invoice.invoicePdfUrl` — nécessaire au critère 2 (« lien PDF Stripe »), absent
  du schéma ITEM-020. Peuplé par `recordInvoiceFromStripe` (`lib/billing.ts`,
  ITEM-022) depuis `invoice.invoice_pdf` — additif, ne change pas le comportement
  déjà couvert par les critères d'ITEM-022.
- `app/api/billing/portal/route.ts` : crée une session Stripe Billing Portal
  (`stripe.billingPortal.sessions.create`) pour l'organisation active — même garde
  de permission (`admin:access`) que `app/api/billing/checkout/route.ts`
  (ITEM-021). Le portail Stripe gère lui-même le moyen de paiement (et
  l'historique de facturation côté Stripe) : pas d'UI à reconstruire ici.
- `components/billing/ManageBillingButton.tsx` : bouton client — `fetch` vers la
  route ci-dessus puis redirection externe (`window.location.href`), même pattern
  que `PlanCard` (ITEM-021).
- `components/billing/SubscriptionStatus.tsx` / `TransactionTable.tsx` : composants
  serveur simples (pas de `"use client"` sauf le bouton du portail).
- `app/(protected)/billing/page.tsx`, `app/(protected)/billing/invoices/page.tsx` :
  garde d'accès (session + permission `admin:access`, identique aux pages
  `/billing/plans` d'ITEM-021).

## Captures attendues
Page `/billing` avec statut d'abonnement (plan, badge de statut, date de
renouvellement) et bouton « Gérer le moyen de paiement » ; page `/billing/invoices`
avec la liste des factures (montant, date, statut, lien PDF si disponible).

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-16 (implement) — démarrage
- 2026-07-16 (implement) — implémenté : pages `/billing` (statut d'abonnement +
  portail client Stripe) et `/billing/invoices` (historique factures), ajout
  `Invoice.invoicePdfUrl`. Fichiers : `prisma/schema.prisma`,
  `prisma/migrations/20260716090547_add_invoice_pdf_url/`, `lib/billing.ts`,
  `app/api/billing/portal/route.ts`, `components/billing/ManageBillingButton.tsx`,
  `components/billing/SubscriptionStatus.tsx`, `components/billing/TransactionTable.tsx`,
  `app/(protected)/billing/page.tsx`, `app/(protected)/billing/invoices/page.tsx`.
- 2026-07-18 (backlog) — ITEM-091 a ajouté un lien « Choisir/Changer de
  plan » toujours visible dans `SubscriptionStatus`. ITEM-096 adaptera
  ensuite `/billing*` et `SubscriptionStatus` (permission `canManage`) au
  modèle de facturation par owner (ITEM-094/095) — un admin non-owner passera
  en lecture seule sur ces pages.
