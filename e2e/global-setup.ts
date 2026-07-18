import "dotenv/config"
import { execFileSync } from "node:child_process"
import { Client } from "pg"

/**
 * Dérive l'URL de la base de test E2E depuis `DATABASE_URL` (suffixe `_e2e` sur le
 * nom de la base) — isolée de la base de développement (ITEM-058, critère 2).
 * `E2E_DATABASE_URL` permet de surcharger explicitement si besoin.
 */
export function resolveE2eDatabaseUrl(): string {
  if (process.env.E2E_DATABASE_URL) return process.env.E2E_DATABASE_URL

  const base = process.env.DATABASE_URL
  if (!base) throw new Error("[e2e] DATABASE_URL est requis pour dériver la base de test E2E.")

  const url = new URL(base)
  const dbName = url.pathname.replace(/^\//, "")
  if (!dbName) throw new Error("[e2e] DATABASE_URL ne contient pas de nom de base.")
  url.pathname = `/${dbName}_e2e`
  return url.toString()
}

/** Crée la base de test si elle n'existe pas déjà — connexion via la base `postgres` de maintenance. */
async function ensureDatabaseExists(databaseUrl: string): Promise<void> {
  const target = new URL(databaseUrl)
  const dbName = target.pathname.replace(/^\//, "")

  const adminUrl = new URL(databaseUrl)
  adminUrl.pathname = "/postgres"

  const client = new Client({ connectionString: adminUrl.toString() })
  await client.connect()
  try {
    const { rowCount } = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName])
    if (rowCount === 0) {
      console.log(`[e2e] Création de la base de test "${dbName}"…`)
      // Nom de base non interpolable en paramètre lié côté Postgres — dérivé de
      // DATABASE_URL (config locale/CI de confiance), jamais d'une entrée utilisateur.
      await client.query(`CREATE DATABASE "${dbName}"`)
    }
  } finally {
    await client.end()
  }
}

/**
 * Global setup Playwright (ITEM-058) : garantit une base de test isolée, migrée et
 * seedée (plans Stripe locaux nécessaires au parcours de souscription) avant que le
 * `webServer` ne serve la moindre requête de test. Rejoué à chaque run — idempotent
 * (création de base conditionnelle, migrations/seed déjà idempotents côté Prisma).
 */
export default async function globalSetup(): Promise<void> {
  const e2eDatabaseUrl = resolveE2eDatabaseUrl()
  // Consommé par playwright.config.ts pour injecter la même URL dans l'env du `webServer`.
  process.env.E2E_DATABASE_URL = e2eDatabaseUrl

  await ensureDatabaseExists(e2eDatabaseUrl)

  const childEnv = { ...process.env, DATABASE_URL: e2eDatabaseUrl }

  console.log("[e2e] Application des migrations sur la base de test…")
  execFileSync("pnpm", ["exec", "prisma", "migrate", "deploy"], { env: childEnv, stdio: "inherit" })

  console.log("[e2e] Seed de la base de test (plans requis pour le parcours de souscription)…")
  execFileSync("pnpm", ["exec", "tsx", "prisma/seed.ts"], { env: childEnv, stdio: "inherit" })
}
