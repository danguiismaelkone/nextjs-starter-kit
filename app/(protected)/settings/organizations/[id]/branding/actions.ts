"use server"

import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { zodFieldErrors } from "@/lib/validation"
import { brandingSchema } from "@/lib/validators/organization"
import { isWhiteLabelOrganization } from "@/lib/billing"

export interface BrandingActionState {
  success?: boolean
  formError?: string
  fieldErrors?: Record<string, string>
}

export async function updateBrandingAction(
  _prevState: BrandingActionState,
  formData: FormData
): Promise<BrandingActionState> {
  const session = await getSession()
  if (!session?.user) return { formError: "Session introuvable, veuillez vous reconnecter." }

  const parsed = brandingSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { fieldErrors: zodFieldErrors(parsed.error) }
  }
  const { organizationId, primaryColor, fontFamily, favicon, emailFromName, hideOriginBranding } = parsed.data

  // Seuls owner/admin de CETTE organisation peuvent l'éditer — même règle que
  // `updateOrganizationAction` (ITEM-017).
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, organizationId, status: "active" },
  })
  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    return { formError: "Vous n'avez pas les droits pour modifier cette organisation." }
  }

  // Masquer la marque d'origine (ITEM-069, critère 2) est réservé au plan
  // White Label — vérifié ici côté serveur, pas seulement caché dans l'UI
  // (même principe qu'ITEM-066/067 pour le plan Enterprise).
  if (hideOriginBranding && !(await isWhiteLabelOrganization(organizationId))) {
    return { formError: "Le masquage de la marque d'origine est réservé aux organisations sur le plan White Label." }
  }

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      primaryColor: primaryColor || null,
      fontFamily: fontFamily || null,
      favicon: favicon || null,
      emailFromName: emailFromName || null,
      hideOriginBranding,
    },
  })

  revalidatePath(`/settings/organizations/${organizationId}/branding`)
  // La couleur est appliquée dans le layout protégé sur toutes les pages.
  revalidatePath("/", "layout")
  return { success: true }
}
