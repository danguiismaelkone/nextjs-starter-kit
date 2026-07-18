import "dotenv/config"
import { defineConfig, devices } from "@playwright/test"
import { resolveE2eDatabaseUrl } from "./e2e/global-setup"

// Port dédié (distinct de 3000, ITEM-058) : ne doit jamais entrer en conflit avec un
// `pnpm dev` déjà lancé localement pendant que la suite E2E tourne.
const PORT = 3100
const BASE_URL = `http://localhost:${PORT}`

// Calculée une fois ici (et re-dérivée de façon identique dans `e2e/global-setup.ts`,
// à partir de la même `DATABASE_URL`) : le `webServer` ci-dessous a besoin de cette
// valeur au moment où Playwright charge cette config, avant que `globalSetup` ne
// s'exécute — d'où une fonction pure partagée plutôt qu'une variable posée par
// `globalSetup` dans `process.env`.
const e2eDatabaseUrl = resolveE2eDatabaseUrl()

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  // Un seul worker : les 3 parcours partagent la même base de test E2E et le même
  // serveur Next — évite les interférences entre specs plutôt que d'isoler par worker.
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["html", { open: "never" }]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm exec next dev -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      DATABASE_URL: e2eDatabaseUrl,
      BETTER_AUTH_URL: BASE_URL,
    } as Record<string, string>,
  },
})
