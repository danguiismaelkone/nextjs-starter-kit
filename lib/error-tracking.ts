import * as Sentry from "@sentry/node"

let initialized = false

/**
 * Initialise le SDK Sentry côté serveur (Node.js — routes API, Server Actions,
 * webhooks) si `SENTRY_DSN` est configurée, sinon ne fait rien : même patron
 * "client paresseux, dégrade proprement sans configuration" que
 * `getStripeClient()`/`getResendClient()` ailleurs dans ce repo. Appelée depuis
 * `instrumentation.ts#register()` (une seule fois par process serveur).
 */
export function initErrorTracking(): void {
  if (initialized) return
  initialized = true

  const dsn = process.env.SENTRY_DSN
  if (!dsn) return

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0,
  })
}

export interface ErrorContext {
  userId?: string
  organizationId?: string
  requestId?: string
  route?: string
  [key: string]: unknown
}

/**
 * Remonte une erreur au service de tracking (ITEM-062, critère 2) avec le
 * contexte disponible (utilisateur, organisation, requête). `Sentry.*` est un
 * no-op sûr tant que `initErrorTracking()` n'a pas été appelée avec une DSN —
 * jamais d'exception levée par cette fonction elle-même, y compris si
 * `error` n'est pas une vraie `Error` (ex. valeur rejetée arbitraire).
 */
export function reportError(error: unknown, context?: ErrorContext): void {
  Sentry.withScope((scope) => {
    if (context?.userId) scope.setUser({ id: context.userId })
    if (context?.organizationId) scope.setTag("organizationId", context.organizationId)
    if (context?.route) scope.setTag("route", context.route)
    if (context?.requestId) scope.setTag("requestId", context.requestId)
    if (context) scope.setContext("app", context)

    if (error instanceof Error) {
      Sentry.captureException(error)
    } else {
      Sentry.captureMessage(typeof error === "string" ? error : JSON.stringify(error), "error")
    }
  })
}
