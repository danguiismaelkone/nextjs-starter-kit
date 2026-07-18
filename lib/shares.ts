import { randomBytes } from "node:crypto"
import { prisma } from "@/lib/prisma"

export const SHARE_ACCESS_LEVELS = ["view", "comment"] as const
export type ShareAccessLevel = (typeof SHARE_ACCESS_LEVELS)[number]

export const SHARE_VISIBILITIES = ["public", "restricted"] as const
export type ShareVisibility = (typeof SHARE_VISIBILITIES)[number]

/** Même génération que `Invitation.token` (`app/(protected)/admin/invitations/actions.ts`) — 24 octets hex, non devinable. */
export function generateShareToken(): string {
  return randomBytes(24).toString("hex")
}

/** Lien de partage par son token, avec le document associé (quel que soit son état). */
export async function resolveShareByToken(token: string) {
  return prisma.documentShare.findUnique({
    where: { token },
    include: { document: true },
  })
}

/** Vrai si le lien est encore utilisable : ni révoqué, ni expiré. */
export function isShareActive(share: { revokedAt: Date | null; expiresAt: Date | null }): boolean {
  if (share.revokedAt) return false
  if (share.expiresAt && share.expiresAt < new Date()) return false
  return true
}
