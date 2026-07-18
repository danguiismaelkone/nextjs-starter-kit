"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export interface PlanData {
  id: string
  name: string
  /** Montant en plus petite unité monétaire (centimes). */
  price: number
  currency: string
  interval: string
  features: string[]
}

function formatPrice(price: number, currency: string) {
  if (price === 0) return "Gratuit"
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(price / 100)
}

interface PlanCardProps {
  plan: PlanData
  currentPlanId?: string | null
  /** Prix (centimes) du plan actuel, pour distinguer upgrade/downgrade. */
  currentPlanPrice?: number | null
  /** Organisation déjà abonnée via Stripe (pas une simple souscription initiale). */
  hasActiveSubscription?: boolean
  highlighted?: boolean
  /**
   * Chemin relatif vers lequel revient Stripe Checkout (ITEM-074) — transmis
   * tel quel à `POST /api/billing/checkout`, qui retombe sur `/billing/plans`
   * si absent. Utilisé par l'étape « Plan » de l'assistant d'inscription
   * (`/onboarding`) pour revenir à cette étape plutôt qu'à `/billing/plans`.
   */
  returnTo?: string
}

export function PlanCard({ plan, currentPlanId, currentPlanPrice, hasActiveSubscription, highlighted, returnTo }: PlanCardProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const isCurrent = currentPlanId === plan.id
  const isUpgrade = currentPlanPrice != null && plan.price > currentPlanPrice

  function handleClick() {
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      if (!hasActiveSubscription) {
        const response = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId: plan.id, ...(returnTo ? { returnTo } : {}) }),
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok || !data.url) {
          setError(data.error ?? "Impossible de démarrer la souscription.")
          return
        }
        // Redirection vers Stripe Checkout : URL externe, pas une route interne.
        window.location.href = data.url
        return
      }

      const response = await fetch("/api/billing/change-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? "Impossible de changer de plan.")
        return
      }
      if (data.immediate) {
        setSuccess("Plan mis à niveau.")
        router.refresh()
        return
      }
      if (data.scheduled && data.effectiveAt) {
        router.push(`/billing/plans?scheduled=1&effective=${encodeURIComponent(data.effectiveAt)}`)
      }
    })
  }

  return (
    <Card className={cn("flex flex-col", highlighted && "border-primary shadow-md")}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{plan.name}</CardTitle>
          {highlighted && <Badge>Populaire</Badge>}
        </div>
        <CardDescription>
          <span className="text-2xl font-bold tracking-tight text-foreground">
            {formatPrice(plan.price, plan.currency)}
          </span>
          {plan.price > 0 && <span className="text-muted-foreground"> /{plan.interval === "year" ? "an" : "mois"}</span>}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <ul className="space-y-2 text-sm">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              {feature}
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-2">
        <Button
          className="w-full"
          variant={highlighted ? "default" : "outline"}
          disabled={isPending || isCurrent}
          onClick={handleClick}
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isCurrent
            ? "Plan actuel"
            : !hasActiveSubscription
              ? "Souscrire"
              : isUpgrade
                ? "Mettre à niveau"
                : "Rétrograder (fin de période)"}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}
      </CardFooter>
    </Card>
  )
}
