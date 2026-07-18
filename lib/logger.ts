import { reportError, type ErrorContext } from "@/lib/error-tracking"

type LogLevel = "debug" | "info" | "warn" | "error"

export interface LogContext {
  userId?: string
  organizationId?: string
  requestId?: string
  route?: string
  [key: string]: unknown
}

/**
 * Noms de clé (insensibles à la casse, `snake_case`/`camelCase` confondus)
 * jamais journalisés en clair (ITEM-062, critère 3) — mots de passe, clés
 * API/secrets, jetons/tokens, en-têtes d'autorisation. Volontairement large
 * (mieux vaut sur-rédiger une clé anodine que sous-rédiger un secret) et
 * appliqué récursivement à tout objet passé en contexte, pas seulement au
 * premier niveau.
 */
const SENSITIVE_KEY_PATTERN = /password|passwd|secret|token|api[-_]?key|authorization|privatekey|private[-_]key/i

const MAX_REDACT_DEPTH = 6

function redact(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (value === null || typeof value !== "object") return value
  if (depth >= MAX_REDACT_DEPTH) return "[Truncated]"

  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack }
  }

  if (seen.has(value)) return "[Circular]"
  seen.add(value)

  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1, seen))

  const result: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    result[key] = SENSITIVE_KEY_PATTERN.test(key) ? "[REDACTED]" : redact(val, depth + 1, seen)
  }
  return result
}

function emit(level: LogLevel, message: string, context?: LogContext) {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(context ? (redact(context) as Record<string, unknown>) : {}),
  }
  const line = JSON.stringify(entry)

  if (level === "error") console.error(line)
  else if (level === "warn") console.warn(line)
  else console.log(line)
}

/**
 * Logger structuré (ITEM-062) — une ligne JSON par appel (niveau, message,
 * horodatage, contexte), utilisable depuis les Server Actions, routes API et
 * webhooks. Toute donnée sensible présente dans `context` (mot de passe, clé
 * API, token) est automatiquement masquée avant sérialisation, quel que soit
 * l'appelant (critère 3 — pas une simple convention à respecter). `error()`
 * remonte aussi l'erreur au service de tracking configuré (critère 2, voir
 * `lib/error-tracking.ts`).
 */
export const logger = {
  debug(message: string, context?: LogContext) {
    emit("debug", message, context)
  },
  info(message: string, context?: LogContext) {
    emit("info", message, context)
  },
  warn(message: string, context?: LogContext) {
    emit("warn", message, context)
  },
  error(message: string, error?: unknown, context?: LogContext) {
    const errorField = error !== undefined ? { error: redact(error) } : {}
    emit("error", message, { ...context, ...errorField })
    reportError(error ?? message, context as ErrorContext | undefined)
  },
}
