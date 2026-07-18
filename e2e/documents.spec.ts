import path from "node:path"
import { readFileSync } from "node:fs"
import { test, expect } from "@playwright/test"
import { generateTestAccount, signUpAndCreateOrganization } from "./helpers/auth"

const FIXTURE_PATH = path.join(__dirname, "fixtures", "test-image.png")

test("un membre peut uploader un document et le retrouve dans la liste (ITEM-028)", async ({ page }) => {
  const account = generateTestAccount("documents")
  await signUpAndCreateOrganization(page, account)

  await page.goto("/documents")
  await expect(page.getByText("Aucun document pour le moment.")).toBeVisible()

  const fileName = `e2e-upload-${Date.now()}.png`
  // react-dropzone : cibler directement l'`<input type="file">` sous-jacent
  // plutôt que de simuler un glisser-déposer, plus fiable en E2E.
  const fileChooserInput = page.locator('input[type="file"]')
  const buffer = readFileSync(FIXTURE_PATH)
  await fileChooserInput.setInputFiles({ name: fileName, mimeType: "image/png", buffer })

  await expect(page.locator("li", { hasText: fileName }).getByText("Envoyé.")).toBeVisible({ timeout: 15_000 })

  // Le document uploadé apparaît dans le tableau (rafraîchi après l'upload) —
  // preuve qu'il est bien persisté côté serveur, pas seulement dans l'état
  // local de la zone d'upload.
  await expect(page.getByRole("row", { name: new RegExp(fileName) })).toBeVisible()
})
