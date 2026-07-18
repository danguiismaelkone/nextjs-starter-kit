import { NextResponse } from "next/server"
import { runHealthChecks } from "@/lib/health"
import { sendAlert } from "@/lib/alerts"
import { logger } from "@/lib/logger"

/**
 * Nombre d'échecs consécutifs avant déclenchement d'une alerte (ITEM-063,
 * critère 2) — un premier échec isolé (déploiement en cours, coupure réseau
 * transitoire) ne doit pas réveiller personne ; seule une panne qui persiste
 * sur plusieurs appels successifs déclenche une notification.
 */
const CONSECUTIVE_FAILURE_THRESHOLD = Number(process.env.HEALTH_ALERT_THRESHOLD) || 3

/**
 * État en mémoire, par process serveur (même limite documentée que
 * `lib/rate-limit.ts`, ITEM-054 : ne survit pas à un redémarrage, non partagé
 * entre plusieurs instances). Suffisant pour ce périmètre — un vrai déploiement
 * multi-instance appellerait typiquement `/api/health` depuis un service de
 * supervision externe (uptime monitor) qui gère lui-même la logique
 * d'alerte "N échecs consécutifs" côté monitoring, ce endpoint restant la
 * seule source de vérité sur l'état courant.
 */
let consecutiveFailures = 0
let alertActive = false

export async function GET() {
  const report = await runHealthChecks()

  if (report.status === "ok") {
    if (alertActive) {
      await sendAlert({
        subject: "Rétabli : contrôles de santé de nouveau OK",
        message: `Les vérifications échouaient depuis ${consecutiveFailures} appel(s) consécutif(s) sur /api/health — désormais rétabli.`,
      })
      alertActive = false
    }
    consecutiveFailures = 0
    return NextResponse.json(report)
  }

  consecutiveFailures += 1
  logger.error("Échec d'un contrôle de santé", undefined, {
    route: "health",
    consecutiveFailures,
    checks: report.checks,
  })

  if (consecutiveFailures >= CONSECUTIVE_FAILURE_THRESHOLD && !alertActive) {
    alertActive = true
    const failedChecks = Object.entries(report.checks)
      .filter(([, check]) => check.status === "error")
      .map(([name, check]) => `${name}: ${check.error ?? "échec"}`)
      .join(" ; ")

    await sendAlert({
      subject: `Alerte santé : ${consecutiveFailures} échecs consécutifs`,
      message: `/api/health échoue depuis ${consecutiveFailures} appels consécutifs. Composants en échec — ${failedChecks}`,
    })
  }

  return NextResponse.json(report, { status: 503 })
}
