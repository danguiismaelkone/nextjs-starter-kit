import { type Page, expect } from "@playwright/test"

export interface TestAccount {
  name: string
  email: string
  password: string
  organizationName: string
}

/** Compte de test unique par exécution — évite toute collision entre runs successifs. */
export function generateTestAccount(prefix: string): TestAccount {
  const unique = `${Date.now()}-${Math.floor(Math.random() * 100_000)}`
  return {
    name: `E2E ${prefix}`,
    email: `e2e-${prefix}-${unique}@example.com`,
    password: "E2eTestPassword123!",
    organizationName: `E2E Org ${prefix} ${unique}`,
  }
}

/**
 * Inscription complète via l'UI réelle (ITEM-002 + ITEM-073 : compte créé sur
 * `/register`, organisation et invitations gérées par l'assistant
 * `/onboarding` juste après) — laisse la page sur `/dashboard`, session
 * active. L'étape invitations est ignorée (« Passer cette étape ») : les
 * specs qui utilisent ce helper n'ont besoin que d'une organisation prête,
 * pas de coéquipiers invités.
 */
export async function signUpAndCreateOrganization(page: Page, account: TestAccount): Promise<void> {
  await page.goto("/register")

  await page.getByLabel("Nom").fill(account.name)
  await page.getByLabel("E-mail").fill(account.email)
  await page.getByLabel("Mot de passe", { exact: true }).fill(account.password)
  await page.getByLabel("Confirmer le mot de passe").fill(account.password)
  await page.getByRole("button", { name: "Créer un compte" }).click()

  await page.waitForURL("/onboarding")
  await page.getByLabel("Nom de l'organisation").fill(account.organizationName)
  await page.getByRole("button", { name: "Continuer" }).click()

  await page.getByRole("button", { name: "Passer cette étape" }).click()

  await page.waitForURL("/dashboard")
  await expect(page.getByRole("heading", { level: 1, name: /^Bonjour/ })).toBeVisible()
}
