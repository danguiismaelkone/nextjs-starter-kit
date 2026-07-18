import { cache } from "react"
import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { seedSystemRoles } from "@/lib/permissions"
import { startTrialSubscription } from "@/lib/billing"
import { ORGANIZATION_DOMAIN_HEADER, platformHostname } from "@/lib/domains"

export const ACTIVE_ORGANIZATION_COOKIE = "active_organization_id"

export interface CurrentOrganization {
  id: string
  name: string
  slug: string
  logo: string | null
  primaryColor: string | null
  fontFamily: string | null
  favicon: string | null
  emailFromName: string | null
  hideOriginBranding: boolean
  role: string
}

/**
 * Organisation active de l'utilisateur connecté : résolue par domaine
 * personnalisé (`proxy.ts` + `Organization.customDomain`, ITEM-068,
 * White Label) si le `Host` de la requête en identifie une, sinon
 * l'organisation choisie via `OrgSwitcher` (cookie, ITEM-015) si elle est
 * toujours valide, sinon la plus ancienne adhésion active (comportement par
 * défaut pré-ITEM-015, conservé en repli — cookie absent, périmé, ou pointant
 * vers une organisation quittée).
 *
 * `cache()` (React, dédup par requête) : appelée à la fois par le layout
 * protégé et par `generateMetadata` (favicon/titre White Label, ITEM-069) —
 * évite une deuxième résolution identique (session + Prisma) pour la même
 * requête serveur.
 */
export const getCurrentOrganization = cache(async (): Promise<CurrentOrganization | null> => {
  const session = await getSession()
  if (!session?.user) return null

  const domainMembership = await getOrganizationMembershipByRequestDomain(session.user.id)
  if (domainMembership !== undefined) {
    // `null` = domaine personnalisé reconnu mais l'utilisateur n'en est pas
    // membre : résolution stricte, sans repli sur le cookie — visiter le
    // domaine White Label d'une organisation ne doit jamais exposer une AUTRE
    // organisation dont l'utilisateur serait membre par ailleurs.
    return domainMembership && toCurrentOrganization(domainMembership)
  }

  const cookieStore = await cookies()
  const activeOrganizationId = cookieStore.get(ACTIVE_ORGANIZATION_COOKIE)?.value

  const membership =
    (activeOrganizationId &&
      (await prisma.membership.findFirst({
        where: { userId: session.user.id, organizationId: activeOrganizationId, status: "active" },
        include: { organization: true },
      }))) ||
    (await prisma.membership.findFirst({
      where: { userId: session.user.id, status: "active" },
      orderBy: { createdAt: "asc" },
      include: { organization: true },
    }))

  if (!membership) return null

  return toCurrentOrganization(membership)
})

type MembershipWithOrganization = {
  role: string
  organization: {
    id: string
    name: string
    slug: string
    logo: string | null
    primaryColor: string | null
    fontFamily: string | null
    favicon: string | null
    emailFromName: string | null
    hideOriginBranding: boolean
  }
}

function toCurrentOrganization(membership: MembershipWithOrganization): CurrentOrganization {
  return {
    id: membership.organization.id,
    name: membership.organization.name,
    slug: membership.organization.slug,
    logo: membership.organization.logo,
    primaryColor: membership.organization.primaryColor,
    fontFamily: membership.organization.fontFamily,
    favicon: membership.organization.favicon,
    emailFromName: membership.organization.emailFromName,
    hideOriginBranding: membership.organization.hideOriginBranding,
    role: membership.role,
  }
}

/**
 * `undefined` : requête sur le domaine propre de la plateforme (résolution
 * par domaine non pertinente, court-circuitée avant toute requête Prisma —
 * `platformHostname()` n'est ici qu'une optimisation de trafic normal, pas la
 * frontière de sécurité). `null` : domaine personnalisé reconnu (une
 * `Organization.customDomain` correspond) mais l'utilisateur n'en est pas
 * membre actif. Sinon : l'adhésion de l'utilisateur à l'organisation propriétaire
 * de ce domaine.
 */
async function getOrganizationMembershipByRequestDomain(
  userId: string
): Promise<MembershipWithOrganization | null | undefined> {
  const domain = (await headers()).get(ORGANIZATION_DOMAIN_HEADER)
  if (!domain || domain === platformHostname()) return undefined

  const membership = await prisma.membership.findFirst({
    where: { userId, status: "active", organization: { customDomain: domain } },
    include: { organization: true },
  })
  return membership ?? null
}

export interface OrganizationSummary {
  id: string
  name: string
  slug: string
  logo: string | null
}

/** Organisations actives de l'utilisateur connecté, pour `OrgSwitcher`. */
export async function listUserOrganizations(): Promise<OrganizationSummary[]> {
  const session = await getSession()
  if (!session?.user) return []

  const memberships = await prisma.membership.findMany({
    where: { userId: session.user.id, status: "active" },
    orderBy: { createdAt: "asc" },
    include: { organization: true },
  })

  return memberships.map((membership) => ({
    id: membership.organization.id,
    name: membership.organization.name,
    slug: membership.organization.slug,
    logo: membership.organization.logo,
  }))
}

/**
 * Variante stricte pour les pages/actions qui nécessitent une organisation.
 * Un utilisateur connecté sans organisation (ex. inscrit avant ITEM-014) est
 * renvoyé au dashboard plutôt que de planter — l'onboarding qui rattrape ce
 * cas est hors périmètre de cet item.
 */
export async function requireOrganization(): Promise<CurrentOrganization> {
  const session = await getSession()
  if (!session?.user) redirect("/login")

  const organization = await getCurrentOrganization()
  if (!organization) redirect("/dashboard")

  return organization
}

export type OrgAdminCheck =
  | { ok: true; userId: string; organization: CurrentOrganization }
  | { ok: false; status: 401 | 403 | 404; error: string }

/**
 * Session + organisation active + rôle owner/admin, pour les routes API
 * réservées aux administrateurs d'organisation (ITEM-048 ; même règle que
 * `app/(protected)/settings/organizations/[id]` et ITEM-047) — renvoie un
 * statut/erreur plutôt que de rediriger, pour un usage en route API.
 */
export async function requireOrganizationAdmin(): Promise<OrgAdminCheck> {
  const session = await getSession()
  if (!session?.user) return { ok: false, status: 401, error: "Non authentifié." }

  const organization = await getCurrentOrganization()
  if (!organization) return { ok: false, status: 404, error: "Organisation introuvable." }

  if (organization.role !== "owner" && organization.role !== "admin") {
    return { ok: false, status: 403, error: "Réservé aux administrateurs de l'organisation." }
  }

  return { ok: true, userId: session.user.id, organization }
}

/**
 * Organisation d'un utilisateur arbitraire (ITEM-050, console super-admin) —
 * contrairement à `getCurrentOrganization()`, ne dépend pas de la session
 * courante ni du cookie d'organisation active : sert à journaliser une action
 * super-admin (`AuditLog.organizationId` est obligatoire) sous l'organisation
 * du compte ciblé plutôt que celle de l'acteur.
 */
export async function getPrimaryOrganizationId(userId: string): Promise<string | null> {
  const membership = await prisma.membership.findFirst({
    where: { userId, status: "active" },
    orderBy: { createdAt: "asc" },
  })
  return membership?.organizationId ?? null
}

const DIACRITICS_REGEX = new RegExp("[\\u0300-\\u036f]", "g")

export function slugify(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return base || "organisation"
}

/**
 * Crée une organisation avec l'utilisateur donné comme `owner` (onboarding à
 * l'inscription, ITEM-014). Le slug est déduit du nom et désambiguïsé en cas
 * de collision.
 */
export async function createOrganizationWithOwner(userId: string, name: string) {
  const baseSlug = slugify(name)
  let slug = baseSlug
  let suffix = 1
  while (await prisma.organization.findUnique({ where: { slug } })) {
    suffix += 1
    slug = `${baseSlug}-${suffix}`
  }

  // Pas de `revalidateTag(dashboardStatsTag(...))` ici (ITEM-060) : l'organisation
  // n'existe pas avant cet appel, donc aucune entrée de cache `getStats`/
  // `getChartData` (lib/dashboard.ts) ne peut déjà exister pour son id — rien à
  // invalider. Voir `app/(protected)/admin/users/actions.ts` et
  // `app/invite/accept/actions.ts` pour les mutations d'adhésion sur une
  // organisation déjà existante, elles.
  const organization = await prisma.organization.create({
    data: {
      name,
      slug,
      memberships: {
        create: { userId, role: "owner", status: "active" },
      },
    },
  })

  // Sans ça, une organisation fraîchement créée n'a aucun `Role` système et
  // `hasPermission()` (ITEM-018) refuserait même son propre owner.
  await seedSystemRoles(organization.id)

  // Essai gratuit (ITEM-024) : aucune carte requise, aucun plan choisi.
  // Rattaché à l'owner (ITEM-094), pas à l'organisation.
  await startTrialSubscription(userId)

  return organization
}
