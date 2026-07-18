"use server"

import { revalidatePath, revalidateTag } from "next/cache"
import { prisma } from "@/lib/prisma"
import { notify } from "@/lib/notify"
import { triggerWebhooks } from "@/lib/webhooks"
import { idSchema } from "@/lib/validators/organization"
import { DASHBOARD_CACHE_PROFILE, dashboardStatsTag } from "@/lib/cache"
import { logger } from "@/lib/logger"

export interface AcceptInvitationResult {
  success?: boolean
  error?: string
}

export async function acceptInvitationAction(token: string): Promise<AcceptInvitationResult> {
  const parsed = idSchema.safeParse(token)
  if (!parsed.success) {
    return { error: "Cette invitation n'est plus valide." }
  }

  const invitation = await prisma.invitation.findUnique({ where: { token } })
  if (!invitation || invitation.status !== "pending" || invitation.expiresAt < new Date()) {
    return { error: "Cette invitation n'est plus valide." }
  }

  const user = await prisma.user.findUnique({ where: { email: invitation.email } })
  if (!user) {
    return { error: "Le compte n'a pas pu être retrouvé après sa création." }
  }

  const [, , , organization] = await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { role: invitation.role } }),
    prisma.invitation.update({ where: { id: invitation.id }, data: { status: "accepted" } }),
    // Rattache l'utilisateur invité à l'organisation existante de
    // l'invitation plutôt que de le laisser sans organisation (ITEM-014) —
    // l'inscription "normale" (/register) est seule à en créer une nouvelle.
    prisma.membership.upsert({
      where: { userId_organizationId: { userId: user.id, organizationId: invitation.organizationId } },
      create: {
        userId: user.id,
        organizationId: invitation.organizationId,
        role: invitation.role === "admin" ? "admin" : "member",
        status: "active",
      },
      update: { status: "active" },
    }),
    prisma.organization.findUniqueOrThrow({ where: { id: invitation.organizationId }, select: { name: true } }),
  ])

  // Best-effort (ITEM-037) : un échec de notification ne doit pas faire échouer
  // une adhésion déjà actée par la transaction ci-dessus.
  await notify(user.id, "invitation_accepted", { organizationName: organization.name }).catch((err) => {
    logger.warn("Échec de la notification de bienvenue après acceptation d'invitation", {
      route: "invite/accept",
      userId: user.id,
      organizationId: invitation.organizationId,
      error: err,
    })
  })

  // Best-effort (ITEM-048) : `triggerWebhooks` ne lève jamais, mais le `.catch`
  // reste une garde de robustesse cohérente avec `notify` ci-dessus.
  await triggerWebhooks(invitation.organizationId, "member.joined", {
    userId: user.id,
    email: user.email,
    role: invitation.role,
  }).catch((err) => {
    logger.warn("Échec du déclenchement webhook member.joined", {
      route: "invite/accept",
      organizationId: invitation.organizationId,
      error: err,
    })
  })

  // Un membre de plus change `totalUsers`/`newUsersThisMonth` (lib/dashboard.ts).
  revalidateTag(dashboardStatsTag(invitation.organizationId), DASHBOARD_CACHE_PROFILE)
  revalidatePath("/admin/invitations")
  revalidatePath("/admin/users")
  return { success: true }
}
