import { prisma } from "@/lib/prisma"

/**
 * Un flag est désactivé tant qu'aucune ligne `OrganizationFeatureFlag`
 * n'existe pour cette organisation (ITEM-052) — opt-in explicite par le
 * super-admin, jamais activé par défaut à la création du flag.
 */
export async function isFeatureEnabled(organizationId: string, key: string): Promise<boolean> {
  const flag = await prisma.organizationFeatureFlag.findUnique({
    where: { organizationId_key: { organizationId, key } },
  })
  return flag?.enabled ?? false
}
