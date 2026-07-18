"use server"

import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { zodFieldErrors } from "@/lib/validation"
import { customDomainSchema } from "@/lib/validators/organization"
import { platformHostname } from "@/lib/domains"

export interface ActionState {
  success?: boolean
  formError?: string
  fieldErrors?: Record<string, string>
}

export async function updateCustomDomainAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await getSession()
  if (!session?.user) return { formError: "Session introuvable, veuillez vous reconnecter." }

  const parsed = customDomainSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { fieldErrors: zodFieldErrors(parsed.error) }
  }
  const { organizationId, customDomain } = parsed.data

  // Seuls owner/admin de CETTE organisation peuvent l'éditer — vérifié côté
  // serveur (pas seulement via la garde d'accès de la page), même règle que
  // `updateOrganizationAction`/`updateBrandingAction` (ITEM-017/ITEM-049).
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, organizationId, status: "active" },
  })
  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    return { formError: "Vous n'avez pas les droits pour modifier cette organisation." }
  }

  if (customDomain === platformHostname()) {
    return { fieldErrors: { customDomain: "Ce domaine est déjà utilisé par la plateforme elle-même." } }
  }

  if (customDomain) {
    const domainTaken = await prisma.organization.findFirst({
      where: { customDomain, NOT: { id: organizationId } },
    })
    if (domainTaken) {
      return { fieldErrors: { customDomain: "Ce domaine est déjà utilisé par une autre organisation." } }
    }
  }

  await prisma.organization.update({
    where: { id: organizationId },
    data: { customDomain: customDomain || null },
  })

  revalidatePath(`/settings/organizations/${organizationId}/domain`)
  return { success: true }
}
