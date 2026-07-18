import { randomBytes, createHash } from "node:crypto"
import { prisma } from "@/lib/prisma"

const KEY_PREFIX = "sk_"
const VISIBLE_PREFIX_LENGTH = 8

/**
 * Clés API à haute entropie (24 octets aléatoires) — un hash SHA-256 simple
 * suffit pour les stocker (contrairement à un mot de passe utilisateur à
 * faible entropie, qui nécessite bcrypt/scrypt) : c'est l'approche standard
 * (GitHub, Stripe) pour ce type de secret généré côté serveur.
 */
function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex")
}

function generateRawKey(): string {
  return KEY_PREFIX + randomBytes(24).toString("hex")
}

export interface CreateApiKeyInput {
  organizationId: string
  name: string
  createdById: string
}

export interface CreateApiKeyResult {
  /** Clé complète — n'est disponible qu'à cet instant, jamais reconstituable ensuite. */
  fullKey: string
  apiKey: {
    id: string
    name: string
    prefix: string
    createdAt: Date
  }
}

/** Génère une nouvelle clé API pour l'organisation (ITEM-047). */
export async function createApiKey({ organizationId, name, createdById }: CreateApiKeyInput): Promise<CreateApiKeyResult> {
  const fullKey = generateRawKey()
  const prefix = `${fullKey.slice(0, VISIBLE_PREFIX_LENGTH)}…`

  const apiKey = await prisma.apiKey.create({
    data: {
      organizationId,
      name,
      prefix,
      hashedKey: hashApiKey(fullKey),
      createdById,
    },
  })

  return {
    fullKey,
    apiKey: { id: apiKey.id, name: apiKey.name, prefix: apiKey.prefix, createdAt: apiKey.createdAt },
  }
}

/** Clés de l'organisation, du plus récent au plus ancien — jamais la clé complète. */
export async function listApiKeys(organizationId: string) {
  return prisma.apiKey.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { name: true } } },
  })
}

/** Révoque une clé (immédiat) — no-op si elle n'appartient pas à l'organisation ou est déjà révoquée. */
export async function revokeApiKey(organizationId: string, apiKeyId: string): Promise<boolean> {
  const { count } = await prisma.apiKey.updateMany({
    where: { id: apiKeyId, organizationId, revokedAt: null },
    data: { revokedAt: new Date() },
  })
  return count > 0
}

export interface VerifiedApiKey {
  apiKeyId: string
  organizationId: string
}

/**
 * Vérifie une clé API brute (ex. reçue via un en-tête `Authorization`) —
 * fondation réutilisée par l'API publique (ITEM-053). Une clé révoquée ou
 * inconnue est rejetée immédiatement (critère d'acceptation ITEM-047) ; une
 * clé valide voit son `lastUsedAt` mis à jour.
 */
export async function verifyApiKey(rawKey: string): Promise<VerifiedApiKey | null> {
  if (!rawKey.startsWith(KEY_PREFIX)) return null

  const apiKey = await prisma.apiKey.findUnique({ where: { hashedKey: hashApiKey(rawKey) } })
  if (!apiKey || apiKey.revokedAt) return null

  await prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })

  return { apiKeyId: apiKey.id, organizationId: apiKey.organizationId }
}
