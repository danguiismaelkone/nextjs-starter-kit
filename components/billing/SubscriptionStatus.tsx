import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { daysUntil } from "@/lib/utils"
import { CancelModal } from "./CancelModal"
import { ManageBillingButton } from "./ManageBillingButton"

const STATUS: Record<string, { label: string; className: string }> = {
  active: { label: "Actif", className: "bg-green-100 text-green-700 border-green-200" },
  trialing: { label: "Essai", className: "bg-blue-100 text-blue-700 border-blue-200" },
  past_due: { label: "Paiement en retard", className: "bg-amber-100 text-amber-700 border-amber-200" },
  canceled: { label: "Annulé", className: "bg-gray-100 text-gray-600 border-gray-200" },
  expired: { label: "Expiré", className: "bg-gray-100 text-gray-600 border-gray-200" },
}

export interface SubscriptionStatusData {
  status: string
  /** `null` pendant un essai (ITEM-024) démarré sans plan choisi. */
  planName: string | null
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  /** Abonnement Stripe réel (pas un essai pur) — condition pour pouvoir le résilier. */
  hasStripeSubscription: boolean
}

interface SubscriptionStatusProps {
  subscription: SubscriptionStatusData | null
  hasStripeCustomer: boolean
  /**
   * `session.user.id === ownerId` de l'abonnement (ITEM-094/096) : un admin
   * non-owner de l'organisation voit ce même abonnement (potentiellement
   * partagé entre plusieurs organisations du même owner, ITEM-093) en
   * lecture seule — aucun bouton d'action (changer de plan, moyen de
   * paiement, résiliation), qui géreraient l'abonnement personnel de
   * quelqu'un d'autre.
   */
  canManage: boolean
}

export function SubscriptionStatus({ subscription, hasStripeCustomer, canManage }: SubscriptionStatusProps) {
  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Aucun abonnement</CardTitle>
              <CardDescription>Choisissez un plan pour activer les fonctionnalités payantes.</CardDescription>
            </div>
            {canManage && (
              <Button asChild variant="outline">
                <Link href="/billing/plans">Choisir un plan</Link>
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>
    )
  }

  const badge = STATUS[subscription.status] ?? STATUS.active
  const endStr = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(subscription.currentPeriodEnd)
  const isTrial = subscription.status === "trialing"
  const daysLeft = daysUntil(subscription.currentPeriodEnd)
  const canCancel =
    subscription.hasStripeSubscription && !subscription.cancelAtPeriodEnd && subscription.status !== "canceled"

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {subscription.planName ?? "Essai gratuit"}
              <Badge variant="outline" className={badge.className}>
                {badge.label}
              </Badge>
            </CardTitle>
            <CardDescription>
              {isTrial
                ? `${daysLeft} jour${daysLeft > 1 ? "s" : ""} restant${daysLeft > 1 ? "s" : ""} avant la fin de l'essai (${endStr})`
                : subscription.cancelAtPeriodEnd
                  ? `Annulation prévue le ${endStr}`
                  : `Prochain renouvellement le ${endStr}`}
            </CardDescription>
          </div>
          {canManage && (
            <div className="flex items-center gap-2">
              <Button asChild variant="outline">
                <Link href="/billing/plans">{subscription.planName ? "Changer de plan" : "Choisir un plan"}</Link>
              </Button>
              {hasStripeCustomer && <ManageBillingButton />}
              {canCancel && <CancelModal />}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent />
    </Card>
  )
}
