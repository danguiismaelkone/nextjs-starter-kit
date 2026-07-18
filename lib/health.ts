import { prisma } from "@/lib/prisma"
import { pingStorage } from "@/lib/storage"

export interface HealthCheckResult {
  status: "ok" | "error"
  latencyMs: number
  error?: string
}

export interface HealthReport {
  status: "ok" | "down"
  timestamp: string
  checks: {
    database: HealthCheckResult
    storage: HealthCheckResult
  }
}

async function timed(check: () => Promise<unknown>): Promise<HealthCheckResult> {
  const start = Date.now()
  try {
    await check()
    return { status: "ok", latencyMs: Date.now() - start }
  } catch (err) {
    // `err.message` peut être vide (ex. `AggregateError` réseau du SDK S3,
    // voir app/api/ai/ocr/route.ts) — toujours retourner un message explicite.
    const error = err instanceof Error && err.message ? err.message : "Erreur inconnue"
    return { status: "error", latencyMs: Date.now() - start, error }
  }
}

/**
 * Vérifie la connectivité aux dépendances critiques (ITEM-063) : base de
 * données (`SELECT 1`, ne touche aucune table applicative) et stockage
 * S3-compatible (`pingStorage`, lib/storage.ts). Les deux tournent en
 * parallèle — le temps total reflète la plus lente des deux, pas leur somme.
 */
export async function runHealthChecks(): Promise<HealthReport> {
  const [database, storage] = await Promise.all([
    timed(() => prisma.$queryRaw`SELECT 1`),
    timed(() => pingStorage()),
  ])

  const status = database.status === "ok" && storage.status === "ok" ? "ok" : "down"

  return {
    status,
    timestamp: new Date().toISOString(),
    checks: { database, storage },
  }
}
