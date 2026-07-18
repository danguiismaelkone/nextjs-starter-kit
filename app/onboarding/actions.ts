"use server"

import { getSession } from "@/lib/auth"
import { getCurrentOrganization, createOrganizationWithOwner } from "@/lib/organization"
import { zodFieldErrors } from "@/lib/validation"
import { onboardingOrganizationSchema } from "@/lib/validators/organization"

export interface OnboardingOrganizationState {
  success?: boolean
  /**
   * Renvoyé sur succès (ITEM-075) : le logo n'est plus soumis dans ce même
   * formulaire (upload de fichier séparé, une fois l'organisation créée) —
   * le client a besoin de cet id pour appeler
   * `POST /api/organizations/[id]/logo` juste après.
   */
  organizationId?: string
  formError?: string
  fieldErrors?: Record<string, string>
}

/**
 * Étape 1 de l'assistant d'inscription (`/onboarding`, ITEM-073, remplace
 * l'ancien `createOrganizationAction` de `app/(auth)/register/actions.ts`,
 * appelé pendant l'inscription elle-même) : crée l'organisation de
 * l'utilisateur connecté, avec lui comme owner. Idempotent — si
 * l'utilisateur a déjà une organisation (double soumission, retour en
 * arrière), ne recrée rien.
 */
export async function createOnboardingOrganizationAction(
  _prevState: OnboardingOrganizationState,
  formData: FormData
): Promise<OnboardingOrganizationState> {
  const session = await getSession()
  if (!session?.user) {
    return { formError: "Session introuvable, veuillez vous reconnecter." }
  }

  const existing = await getCurrentOrganization()
  if (existing) return { success: true, organizationId: existing.id }

  const parsed = onboardingOrganizationSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { fieldErrors: zodFieldErrors(parsed.error) }
  }
  const { name } = parsed.data

  const organization = await createOrganizationWithOwner(session.user.id, name)

  return { success: true, organizationId: organization.id }
}
