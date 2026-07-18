"use server"

import { cookies } from "next/headers"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ACTIVE_ORGANIZATION_COOKIE } from "@/lib/organization"
import { idSchema } from "@/lib/validators/organization"

export interface SwitchOrganizationResult {
  error?: string
}

/**
 * Server Action appelée par `OrgSwitcher` (ITEM-015) : bascule l'organisation
 * active de l'utilisateur via un cookie httpOnly. Rejette toute organisation
 * dont l'utilisateur n'est pas membre actif (pas de confiance dans l'id
 * fourni par le client).
 *
 * Dans un fichier dédié avec directive `"use server"` de niveau module (et non
 * `lib/organization.ts`) : une directive `"use server"` au niveau d'une seule
 * fonction n'empêche pas Next.js d'embarquer tout le reste du module —
 * `prisma`/`pg` — dans le bundle client dès qu'un Client Component importe
 * quoi que ce soit du fichier.
 */
export async function switchOrganizationAction(organizationId: string): Promise<SwitchOrganizationResult> {
  const session = await getSession()
  if (!session?.user) return { error: "Session introuvable." }

  const parsed = idSchema.safeParse(organizationId)
  if (!parsed.success) return { error: "Organisation introuvable." }

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, organizationId, status: "active" },
  })
  if (!membership) return { error: "Organisation introuvable." }

  const cookieStore = await cookies()
  cookieStore.set(ACTIVE_ORGANIZATION_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  })

  return {}
}
