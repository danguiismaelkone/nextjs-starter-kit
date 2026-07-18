import { PlanCard, type PlanData } from "./PlanCard"

export type { PlanData }

interface PlanGridProps {
  plans: PlanData[]
  currentPlanId?: string | null
  hasActiveSubscription?: boolean
  /** Transmis à chaque `PlanCard` — voir `PlanCardProps.returnTo` (ITEM-074). */
  returnTo?: string
}

export function PlanGrid({ plans, currentPlanId, hasActiveSubscription, returnTo }: PlanGridProps) {
  const currentPlanPrice = plans.find((plan) => plan.id === currentPlanId)?.price ?? null

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {plans.map((plan, index) => (
        <PlanCard
          key={plan.id}
          plan={plan}
          currentPlanId={currentPlanId}
          currentPlanPrice={currentPlanPrice}
          hasActiveSubscription={hasActiveSubscription}
          highlighted={plans.length > 1 && index === 1}
          returnTo={returnTo}
        />
      ))}
    </div>
  )
}
