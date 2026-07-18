import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { getCurrentOrganization } from "@/lib/organization"
import { prisma } from "@/lib/prisma"
import { syncSubscriptionFromCheckoutSession } from "@/lib/billing"
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard"

interface OnboardingPageProps {
  searchParams: Promise<{ session_id?: string; canceled?: string }>
}

/**
 * Assistant d'inscription (ITEM-073/074) : organisation (nom, logo), puis
 * invitations, puis plan — affiché juste après la création du compte
 * (`/register`) et avant `/dashboard`. Route indépendante des groupes
 * `(auth)`/`(protected)` : exige une session (contrairement à `(auth)`) mais
 * pas encore d'organisation active (contrairement à toutes les pages
 * `(protected)`, qui supposent `requireOrganization()`) — l'étape 1 n'en a
 * justement pas encore avant sa propre soumission.
 */
export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const session = await getSession()
  if (!session?.user) redirect("/login")

  const organization = await getCurrentOrganization()
  const { session_id: checkoutSessionId, canceled } = await searchParams

  if (organization) {
    // Retour de Stripe Checkout après un paiement réussi (ITEM-074, critère
    // 2) : synchronise puis part directement vers /dashboard — l'assistant
    // ne se réaffiche pas juste pour rediriger une deuxième fois.
    if (checkoutSessionId) {
      // L'utilisateur qui atteint `/onboarding` avec une organisation déjà
      // créée en est toujours l'owner (seul point de création, ITEM-014) —
      // pas besoin de résoudre l'owner via `getOrganizationOwnerId`.
      await syncSubscriptionFromCheckoutSession(checkoutSessionId, session.user.id)
      redirect("/dashboard")
    }

    // Sinon, un compte déjà configuré ne rejoue pas l'assistant (ITEM-073,
    // critère 5) — SAUF un paiement annulé (`cancel_url`, ITEM-074, critère
    // 4), qui doit ramener sur l'étape « Plan » plutôt que sur /dashboard.
    if (!canceled) redirect("/dashboard")
  }

  const plans = await prisma.plan.findMany({ where: { isActive: true }, orderBy: { price: "asc" } })
  const planData = plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    price: plan.price,
    currency: plan.currency,
    interval: plan.interval,
    features: Array.isArray(plan.features) ? (plan.features as unknown as string[]) : [],
  }))

  // `canceled` ne ramène à l'étape « Plan » que si l'organisation existe déjà
  // (seul cas où ce paramètre peut légitimement apparaître : il vient du
  // retour d'un paiement Stripe annulé, qui suppose une organisation déjà
  // créée à l'étape 1) — jamais pour un compte qui n'a pas encore terminé
  // les étapes précédentes.
  const initialStep = organization && canceled ? "plan" : "organisation"

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <OnboardingWizard plans={planData} initialStep={initialStep} />
    </div>
  )
}
