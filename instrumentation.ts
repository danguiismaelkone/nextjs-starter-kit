import type { Instrumentation } from "next"

/**
 * Point d'entrée officiel Next.js pour l'instrumentation serveur (ITEM-062) —
 * `register()` s'exécute une fois par démarrage de process serveur,
 * `onRequestError` est appelé par Next.js pour toute erreur non interceptée
 * pendant le traitement d'une requête (route API, Server Action, rendu RSC)
 * qui n'a pas déjà été journalisée explicitement via `logger.error()` — filet
 * de sécurité pour le critère 2 (« erreurs non gérées »), complémentaire à
 * l'adoption de `logger.error()` dans les points d'erreur déjà identifiés.
 */
export async function register() {
  // Le SDK Sentry (`@sentry/node`) utilise des API Node (fs, net...) absentes
  // du runtime Edge (`proxy.ts`) — n'initialiser que sur le runtime Node.js.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initErrorTracking } = await import("@/lib/error-tracking")
    initErrorTracking()
  }
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return

  const { reportError } = await import("@/lib/error-tracking")
  reportError(error, { route: request.path, routeType: context.routeType })
}
