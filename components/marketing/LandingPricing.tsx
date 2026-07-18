import Link from "next/link"
import { Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export interface LandingPlan {
  id: string
  name: string
  /** Montant en plus petite unité monétaire (centimes). */
  price: number
  currency: string
  interval: string
  features: string[]
}

function formatPrice(price: number, currency: string): string {
  if (price === 0) return "Gratuit"
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(price / 100)
}

/**
 * Aperçu tarifaire de la landing page (ITEM-072) — présentation seule, pas
 * d'action de souscription (contrairement à `PlanCard`, `/billing/plans`) :
 * un visiteur non authentifié n'a pas encore d'organisation à laquelle
 * rattacher un abonnement Stripe. Chaque plan renvoie donc vers `/register`,
 * l'essai gratuit démarrant automatiquement à la création de l'organisation
 * (`startTrialSubscription`, ITEM-024) — le choix d'un plan payant se fait
 * ensuite depuis `/billing/plans`.
 */
export function LandingPricing({ plans }: { plans: LandingPlan[] }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {plans.map((plan, index) => {
        const highlighted = index === 1
        return (
          <Card key={plan.id} className={highlighted ? "flex flex-col border-primary shadow-md" : "flex flex-col"}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{plan.name}</CardTitle>
                {highlighted && <Badge>Populaire</Badge>}
              </div>
              <CardDescription>
                <span className="text-2xl font-bold tracking-tight text-foreground">
                  {formatPrice(plan.price, plan.currency)}
                </span>
                {plan.price > 0 && (
                  <span className="text-muted-foreground"> /{plan.interval === "year" ? "an" : "mois"}</span>
                )}
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
            <CardFooter>
              <Button asChild className="w-full" variant={highlighted ? "default" : "outline"}>
                <Link href="/register">Commencer</Link>
              </Button>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}
