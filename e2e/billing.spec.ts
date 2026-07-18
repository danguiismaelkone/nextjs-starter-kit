import { test, expect } from "@playwright/test"
import { generateTestAccount, signUpAndCreateOrganization } from "./helpers/auth"

test("un owner peut lancer la souscription au plan Pro via un vrai Stripe Checkout, mode test (ITEM-021)", async ({ page }) => {
  const account = generateTestAccount("billing")
  await signUpAndCreateOrganization(page, account)

  await page.goto("/billing/plans")
  await expect(page.getByRole("heading", { name: "Tarifs" })).toBeVisible()

  // Scope au plan "Pro" (seul plan seedé avec un vrai `stripePriceId` de test,
  // voir prisma/seed.ts + SEED_PRO_STRIPE_PRICE_ID) — "Souscrire" apparaît sur
  // plusieurs cartes de plan, donc jamais de clic non scopé à la bonne carte.
  // `CardTitle` (components/ui/card.tsx) rend un `<div>`, pas un heading
  // sémantique — on filtre donc par texte, pas par rôle `heading`.
  const proCard = page.locator('[data-slot="card"]').filter({ has: page.getByText("Pro", { exact: true }) })
  await expect(proCard).toBeVisible()

  // `PlanCard` déclenche `window.location.href = <url Stripe>` (navigation
  // réelle, pas un routage interne) après un fetch réussi sur
  // /api/billing/checkout — une vraie clé Stripe test mode est configurée
  // (STRIPE_SECRET_KEY) donc ce fetch aboutit à une vraie session Checkout.
  await Promise.all([
    page.waitForURL(/^https:\/\/checkout\.stripe\.com\//, { timeout: 20_000 }),
    proCard.getByRole("button", { name: "Souscrire" }).click(),
  ])

  expect(page.url()).toMatch(/^https:\/\/checkout\.stripe\.com\//)

  // La page Checkout hébergée par Stripe affiche le récapitulatif de commande
  // (nom du produit + montant configurés par l'app lors de la création de la
  // session) — confirme que la bonne session (le bon plan) a été créée, pas
  // seulement une redirection vers le bon domaine. Le montant apparaît à
  // plusieurs endroits de la page (récap produit, ligne, sous-total, total) —
  // `.first()` suffit, seule la présence compte ici.
  await expect(page.getByText("$29.00").first()).toBeVisible({ timeout: 15_000 })
})
