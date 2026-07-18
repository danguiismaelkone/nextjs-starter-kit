import { NextResponse } from "next/server"

const paginationParams = [
  { name: "page", in: "query", schema: { type: "integer", default: 1 }, description: "Numéro de page (défaut 1)." },
  { name: "perPage", in: "query", schema: { type: "integer", default: 20, maximum: 100 }, description: "Taille de page (défaut 20, max 100)." },
]

const errorResponse = {
  description: "Erreur",
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: { code: { type: "string" }, message: { type: "string" } },
            required: ["code", "message"],
          },
        },
        required: ["error"],
      },
    },
  },
}

/** Réponse 429 (ITEM-054) — dépassement de la limite de débit par clé API. */
const rateLimitedResponse = {
  description: "Limite de débit dépassée",
  headers: {
    "Retry-After": { description: "Secondes avant de pouvoir réessayer.", schema: { type: "integer" } },
  },
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: { code: { type: "string", example: "rate_limited" }, message: { type: "string" } },
            required: ["code", "message"],
          },
        },
        required: ["error"],
      },
    },
  },
}

/** En-têtes présents sur toutes les réponses authentifiées (ITEM-054). */
const rateLimitHeaders = {
  "X-RateLimit-Limit": { description: "Limite de requêtes/minute pour cette clé API.", schema: { type: "integer" } },
  "X-RateLimit-Remaining": { description: "Requêtes restantes dans la fenêtre courante.", schema: { type: "integer" } },
  "X-RateLimit-Reset": { description: "Epoch (secondes) de réinitialisation du quota.", schema: { type: "integer" } },
}

const userSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    email: { type: "string" },
    image: { type: "string", nullable: true },
    role: { type: "string", description: "Rôle dans l'organisation (owner, admin, manager, member)." },
    createdAt: { type: "string", format: "date-time" },
  },
}

const documentSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    size: { type: "integer", description: "Taille en octets." },
    mimeType: { type: "string" },
    folderId: { type: "string", nullable: true },
    uploadedById: { type: "string", nullable: true },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
}

function paginationMeta() {
  return {
    type: "object",
    properties: {
      page: { type: "integer" },
      perPage: { type: "integer" },
      total: { type: "integer" },
      totalPages: { type: "integer" },
    },
  }
}

function listResponse(itemSchema: object) {
  return {
    description: "Liste paginée",
    headers: rateLimitHeaders,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: { data: { type: "array", items: itemSchema }, meta: paginationMeta() },
          required: ["data", "meta"],
        },
      },
    },
  }
}

function itemResponse(itemSchema: object) {
  return {
    description: "Ressource",
    headers: rateLimitHeaders,
    content: {
      "application/json": {
        schema: { type: "object", properties: { data: itemSchema }, required: ["data"] },
      },
    },
  }
}

/** Spécification OpenAPI 3.0 statique de l'API publique v1 (ITEM-053), servie pour `/docs`. */
export async function GET() {
  const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000"

  const spec = {
    openapi: "3.0.3",
    info: {
      title: "API publique v1",
      version: "1.0.0",
      description:
        "API REST publique versionnée, authentifiée par clé API d'organisation (voir /settings/api-keys). " +
        "Toutes les ressources sont scopées à l'organisation propriétaire de la clé.",
    },
    servers: [{ url: `${baseUrl}/api/v1` }],
    security: [{ ApiKeyAuth: [] }],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "sk_...",
          description: "Clé API d'organisation, générée depuis /settings/api-keys. En-tête: `Authorization: Bearer sk_...`.",
        },
      },
    },
    paths: {
      "/users": {
        get: {
          summary: "Lister les membres de l'organisation",
          parameters: paginationParams,
          responses: { "200": listResponse(userSchema), "401": errorResponse, "429": rateLimitedResponse },
        },
      },
      "/users/{id}": {
        get: {
          summary: "Récupérer un membre de l'organisation",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": itemResponse(userSchema), "401": errorResponse, "404": errorResponse, "429": rateLimitedResponse },
        },
      },
      "/documents": {
        get: {
          summary: "Lister les documents de l'organisation",
          parameters: paginationParams,
          responses: { "200": listResponse(documentSchema), "401": errorResponse, "429": rateLimitedResponse },
        },
      },
      "/documents/{id}": {
        get: {
          summary: "Récupérer un document de l'organisation",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": itemResponse(documentSchema), "401": errorResponse, "404": errorResponse, "429": rateLimitedResponse },
        },
      },
    },
  }

  return NextResponse.json(spec)
}
