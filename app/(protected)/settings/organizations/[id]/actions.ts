"use server"

import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { zodFieldErrors } from "@/lib/validation"
import { updateOrganizationSchema } from "@/lib/validators/organization"

export interface ActionState {
  success?: boolean
  formError?: string
  fieldErrors?: Record<string, string>
}

export async function updateOrganizationAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await getSession()
  if (!session?.user) return { formError: "Session introuvable, veuillez vous reconnecter." }

  const parsed = updateOrganizationSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { fieldErrors: zodFieldErrors(parsed.error) }
  }
  const { organizationId, name, slug } = parsed.data

  // Seuls owner/admin de CETTE organisation peuvent l'éditer — vérifié côté
  // serveur (pas seulement via la garde d'accès de la page).
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, organizationId, status: "active" },
  })
  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    return { formError: "Vous n'avez pas les droits pour modifier cette organisation." }
  }

  const slugTaken = await prisma.organization.findFirst({
    where: { slug, NOT: { id: organizationId } },
  })
  if (slugTaken) {
    return { fieldErrors: { slug: "Ce slug est déjà utilisé par une autre organisation." } }
  }

  await prisma.organization.update({
    where: { id: organizationId },
    data: { name, slug },
  })

  revalidatePath(`/settings/organizations/${organizationId}`)
  return { success: true }
}
