import "dotenv/config"
import { auth } from "../lib/auth"
import { prisma } from "../lib/prisma"
import { createOrganizationWithOwner } from "../lib/organization"

const OWNER_NAME = "Owner de démo"
const OWNER_EMAIL = process.env.SEED_OWNER_EMAIL || "owner@example.com"
const OWNER_PASSWORD = process.env.SEED_OWNER_PASSWORD || "password123"
const ORGANIZATION_NAME = "Organisation de démo"

// ITEM-050 : le rôle `superadmin` n'est attribuable depuis aucune UI (ni
// l'inscription, ni admin/users) — seed = seul moyen d'obtenir un compte pour
// tester la console `/superadmin`.
const SUPERADMIN_NAME = "Super-admin de démo"
const SUPERADMIN_EMAIL = process.env.SEED_SUPERADMIN_EMAIL || "superadmin@example.com"
const SUPERADMIN_PASSWORD = process.env.SEED_SUPERADMIN_PASSWORD || "password123"

interface SeedPlan {
  name: string
  price: number
  currency: string
  interval: string
  features: string[]
  /// Limite de l'API publique v1 par clé API, req/min (ITEM-054).
  rateLimitPerMinute: number
  stripePriceId: string | null
}

interface SeedFeatureFlag {
  key: string
  description: string
}

// ITEM-052 : catalogue de flags — le seed ne les active pour aucune
// organisation (opt-in explicite par le super-admin depuis `/superadmin/flags`,
// cf. `lib/feature-flags.ts`).
const DEFAULT_FEATURE_FLAGS: SeedFeatureFlag[] = [
  {
    key: "advanced-analytics",
    description: "Section « Analytique avancée » (bêta) sur le tableau de bord.",
  },
]

const DEFAULT_PLANS: SeedPlan[] = [
  {
    name: "Starter",
    price: 0,
    currency: "usd",
    interval: "month",
    features: ["1 organisation", "Fonctionnalités de base"],
    rateLimitPerMinute: 60,
    stripePriceId: process.env.SEED_STARTER_STRIPE_PRICE_ID || null,
  },
  {
    name: "Pro",
    price: 2900,
    currency: "usd",
    interval: "month",
    features: ["Tout Starter", "Support prioritaire", "Facturation avancée"],
    rateLimitPerMinute: 300,
    stripePriceId: process.env.SEED_PRO_STRIPE_PRICE_ID || null,
  },
  {
    name: "Enterprise",
    price: 9900,
    currency: "usd",
    interval: "month",
    // ITEM-066 : gate des rôles RBAC personnalisés — `isEnterpriseOrganization()` (lib/billing.ts)
    // vérifie ce nom de plan, pas cette liste de features (texte libre, non structuré).
    features: ["Tout Pro", "Rôles personnalisés (RBAC)", "SSO/SAML", "Support dédié"],
    rateLimitPerMinute: 1000,
    stripePriceId: process.env.SEED_ENTERPRISE_STRIPE_PRICE_ID || null,
  },
  {
    name: "White Label",
    price: 29900,
    currency: "usd",
    interval: "month",
    // ITEM-069 : gate le masquage de la marque d'origine — `isWhiteLabelOrganization()`
    // (lib/billing.ts) vérifie ce nom de plan, pas cette liste de features.
    features: ["Tout Enterprise", "Domaine personnalisé", "Marque d'origine masquable"],
    rateLimitPerMinute: 1000,
    stripePriceId: process.env.SEED_WHITE_LABEL_STRIPE_PRICE_ID || null,
  },
]

/**
 * Idempotent : ne crée un plan que s'il n'existe pas déjà (pas de contrainte
 * d'unicité sur `Plan.name`) — mais resynchronise `rateLimitPerMinute` (ITEM-054)
 * sur un plan existant, pour que les bases seedées avant cet item reflètent la
 * différenciation par tier plutôt que de rester bloquées sur l'ancien défaut.
 */
async function ensurePlans() {
  const plans = []
  for (const plan of DEFAULT_PLANS) {
    const existing = await prisma.plan.findFirst({ where: { name: plan.name } })
    plans.push(
      existing
        ? await prisma.plan.update({
            where: { id: existing.id },
            data: { rateLimitPerMinute: plan.rateLimitPerMinute },
          })
        : await prisma.plan.create({
            data: { ...plan, isActive: true },
          })
    )
  }
  return plans
}

/** Idempotent : `upsert` par clé (pas de risque de doublon si le seed est rejoué). */
async function ensureFeatureFlags() {
  for (const flag of DEFAULT_FEATURE_FLAGS) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      create: flag,
      update: { description: flag.description },
    })
  }
  return DEFAULT_FEATURE_FLAGS
}

/**
 * Créé via l'API Better Auth (et non `prisma.user.create`) : Better Auth stocke
 * le mot de passe hashé dans `Account` selon son propre schéma — une insertion
 * Prisma directe produirait un compte impossible à authentifier.
 */
async function ensureOwnerUser(): Promise<string> {
  const existing = await prisma.user.findUnique({ where: { email: OWNER_EMAIL } })
  if (existing) return existing.id

  const result = await auth.api.signUpEmail({
    body: { name: OWNER_NAME, email: OWNER_EMAIL, password: OWNER_PASSWORD },
  })
  return result.user.id
}

/** Idempotent — comme `ensureOwnerUser`, mais force `role: "superadmin"` (ITEM-050). */
async function ensureSuperAdminUser(): Promise<string> {
  const existing = await prisma.user.findUnique({ where: { email: SUPERADMIN_EMAIL } })
  if (existing) {
    if (existing.role !== "superadmin") {
      await prisma.user.update({ where: { id: existing.id }, data: { role: "superadmin" } })
    }
    return existing.id
  }

  const result = await auth.api.signUpEmail({
    body: { name: SUPERADMIN_NAME, email: SUPERADMIN_EMAIL, password: SUPERADMIN_PASSWORD },
  })
  await prisma.user.update({ where: { id: result.user.id }, data: { role: "superadmin" } })
  return result.user.id
}

/** Idempotent : réutilise l'organisation existante si l'owner en a déjà une. */
async function ensureOrganization(ownerId: string) {
  const existingMembership = await prisma.membership.findFirst({
    where: { userId: ownerId, status: "active" },
    include: { organization: true },
  })
  if (existingMembership) return existingMembership.organization

  return createOrganizationWithOwner(ownerId, ORGANIZATION_NAME)
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Le seed de développement ne doit jamais être exécuté en production (NODE_ENV=production).")
  }

  const plans = await ensurePlans()
  const ownerId = await ensureOwnerUser()
  const organization = await ensureOrganization(ownerId)
  await ensureSuperAdminUser()
  const featureFlags = await ensureFeatureFlags()

  console.log("\n✅ Seed terminé.")
  console.log(`   Organisation : ${organization.name} (/${organization.slug})`)
  console.log(`   Owner        : ${OWNER_EMAIL} / ${OWNER_PASSWORD}`)
  console.log(`   Super-admin  : ${SUPERADMIN_EMAIL} / ${SUPERADMIN_PASSWORD}`)
  console.log(`   Plans        : ${plans.map((plan) => plan.name).join(", ")}`)
  console.log(`   Feature flags: ${featureFlags.map((flag) => flag.key).join(", ")} (désactivés par défaut)`)
  console.log("\n⚠️  Identifiants de développement uniquement — ne jamais utiliser en production.\n")
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
