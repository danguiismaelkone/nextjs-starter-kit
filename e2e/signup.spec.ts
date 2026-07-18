import { test, expect } from "@playwright/test"
import { generateTestAccount, signUpAndCreateOrganization } from "./helpers/auth"

test("un nouvel utilisateur peut s'inscrire et créer son organisation via l'assistant d'inscription (ITEM-002/073)", async ({ page }) => {
  const account = generateTestAccount("signup")

  await signUpAndCreateOrganization(page, account)

  // Organisation créée à l'étape 1 de l'assistant `/onboarding` — son nom
  // apparaît dans le sélecteur d'organisation du sidebar.
  await expect(page.getByText(account.organizationName)).toBeVisible()

  // La session est bien active côté serveur (pas seulement un état client) :
  // une page protégée reste accessible après un rechargement complet.
  await page.reload()
  await expect(page.getByRole("heading", { level: 1, name: /^Bonjour/ })).toBeVisible()
})
