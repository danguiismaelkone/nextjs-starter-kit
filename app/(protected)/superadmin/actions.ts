"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { auth, getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireSuperAdmin } from "@/lib/authorization"
import { getPrimaryOrganizationId } from "@/lib/organization"
import { logAudit } from "@/lib/audit"
import { featureFlagToggleSchema, idSchema } from "@/lib/validators/organization"

export interface ActionState {
  success?: boolean
  error?: string
}

/**
 * Suspend/réactive un compte utilisateur plateforme (ITEM-050), via le plugin
 * Better Auth `admin` (`banUser`/`unbanUser` — révoque aussi les sessions
 * actives à la suspension). Journalisé dans `AuditLog` (fondation ITEM-051)
 * sous l'organisation principale du compte ciblé.
 */
export async function setUserSuspendedAction(userId: string, suspend: boolean): Promise<ActionState> {
  const session = await requireSuperAdmin()

  const idParsed = idSchema.safeParse(userId)
  if (!idParsed.success) return { error: idParsed.error.issues[0]?.message ?? "Identifiant invalide." }

  if (userId === session.user.id) {
    return { error: "Vous ne pouvez pas suspendre votre propre compte." }
  }

  try {
    if (suspend) {
      await auth.api.banUser({
        body: { userId, banReason: "Suspendu depuis la console super-admin." },
        headers: await headers(),
      })
    } else {
      await auth.api.unbanUser({ body: { userId }, headers: await headers() })
    }
  } catch {
    return { error: "Une erreur est survenue." }
  }

  const organizationId = await getPrimaryOrganizationId(userId)
  if (organizationId) {
    await logAudit({
      organizationId,
      actorId: session.user.id,
      action: suspend ? "user.suspended" : "user.reactivated",
      targetType: "User",
      targetId: userId,
    })
  }

  revalidatePath("/superadmin/users")
  return { success: true }
}

/**
 * Valide et journalise le démarrage d'une impersonation (ITEM-050, ITEM-051)
 * *avant* que le client bascule effectivement la session
 * (`authClient.admin.impersonateUser`, `lib/auth-client.ts`) : une fois la
 * session basculée, l'appelant n'est plus authentifié en tant que
 * super-admin et ne pourrait plus passer `requireSuperAdmin()` pour
 * journaliser l'action après coup.
 */
export async function startImpersonationAction(userId: string): Promise<ActionState> {
  const session = await requireSuperAdmin()

  const idParsed = idSchema.safeParse(userId)
  if (!idParsed.success) return { error: idParsed.error.issues[0]?.message ?? "Identifiant invalide." }

  if (userId === session.user.id) {
    return { error: "Vous ne pouvez pas vous connecter en tant que vous-même." }
  }

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, banned: true } })
  if (!target) return { error: "Utilisateur introuvable." }
  if (target.banned) return { error: "Impossible de se connecter en tant qu'un compte suspendu." }

  const organizationId = await getPrimaryOrganizationId(userId)
  if (organizationId) {
    await logAudit({
      organizationId,
      actorId: session.user.id,
      action: "user.impersonate_start",
      targetType: "User",
      targetId: userId,
    })
  }

  return { success: true }
}

/**
 * Journalise la fin d'une impersonation, appelée par `ImpersonationBanner`
 * *avant* `authClient.admin.stopImpersonating()` : la session active à ce
 * moment est encore celle de l'utilisateur impersonné
 * (`session.impersonatedBy` porte l'id du super-admin à l'origine).
 */
export async function stopImpersonationAction(): Promise<ActionState> {
  const session = await getSession()
  const impersonatedBy = session?.session.impersonatedBy
  if (!session?.user || !impersonatedBy) {
    return { error: "Aucune impersonation en cours." }
  }

  const organizationId = await getPrimaryOrganizationId(session.user.id)
  if (organizationId) {
    await logAudit({
      organizationId,
      actorId: impersonatedBy,
      action: "user.impersonate_stop",
      targetType: "User",
      targetId: session.user.id,
    })
  }

  return { success: true }
}

/**
 * Active/désactive un feature flag pour une organisation (ITEM-052) — absence
 * de ligne `OrganizationFeatureFlag` équivaut à désactivé
 * (`lib/feature-flags.ts#isFeatureEnabled`), donc `upsert` plutôt qu'un simple
 * `update` pour couvrir la toute première activation.
 */
export async function setOrganizationFeatureFlagAction(
  organizationId: string,
  key: string,
  enabled: boolean
): Promise<ActionState> {
  const session = await requireSuperAdmin()

  const parsed = featureFlagToggleSchema.safeParse({ organizationId, key, enabled })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Requête invalide." }

  const [organization, flag] = await Promise.all([
    prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true } }),
    prisma.featureFlag.findUnique({ where: { key } }),
  ])
  if (!organization) return { error: "Organisation introuvable." }
  if (!flag) return { error: "Feature flag introuvable." }

  await prisma.organizationFeatureFlag.upsert({
    where: { organizationId_key: { organizationId, key } },
    create: { organizationId, key, enabled },
    update: { enabled },
  })

  await logAudit({
    organizationId,
    actorId: session.user.id,
    action: "feature_flag.toggled",
    targetType: "FeatureFlag",
    targetId: key,
    metadata: { enabled },
  })

  revalidatePath("/superadmin/flags")
  return { success: true }
}
