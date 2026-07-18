import Link from "next/link"
import { redirect } from "next/navigation"
import { Bell, Building2, CreditCard, FileText, ShieldCheck, Sparkles } from "lucide-react"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { LandingPricing } from "@/components/marketing/LandingPricing"

const FEATURES = [
  {
    icon: Building2,
    title: "Organisations multi-tenant",
    description: "Chaque client dispose de son espace isolé, avec ses membres, ses rôles et ses données propres.",
  },
  {
    icon: ShieldCheck,
    title: "Rôles & permissions",
    description: "Un RBAC complet, jusqu'aux rôles personnalisés pour les organisations Enterprise.",
  },
  {
    icon: CreditCard,
    title: "Facturation intégrée",
    description: "Abonnements, essai gratuit et paiements Stripe prêts à l'emploi, sans configuration manuelle.",
  },
  {
    icon: FileText,
    title: "Gestion documentaire",
    description: "Stockage, organisation en dossiers et partage sécurisé des documents de votre organisation.",
  },
  {
    icon: Bell,
    title: "Notifications temps réel",
    description: "Alertes in-app, e-mail et push tenues à jour selon les préférences de chaque utilisateur.",
  },
  {
    icon: Sparkles,
    title: "Assistant IA intégré",
    description: "Discussion et génération de contenu assistées par IA, directement dans l'application.",
  },
] as const

/**
 * Landing page publique (ITEM-072) — remplace le boilerplate `create-next-app`
 * resté en place depuis l'initialisation du projet. Volontairement minimale
 * (hero + fonctionnalités + aperçu tarifaire) : un site marketing complet
 * (blog, FAQ, formulaire de contact) est hors périmètre, à redécouper en
 * items séparés si besoin.
 */
export default async function LandingPage() {
  const session = await getSession()
  if (session?.user) redirect("/dashboard")

  const plans = await prisma.plan.findMany({ where: { isActive: true }, orderBy: { price: "asc" } })
  const planData = plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    price: plan.price,
    currency: plan.currency,
    interval: plan.interval,
    features: Array.isArray(plan.features) ? (plan.features as unknown as string[]) : [],
  }))

  return (
    <div className="flex flex-col">
      <section className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-24 text-center sm:py-32">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          La fondation SaaS multi-tenant prête à l&apos;emploi
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          Organisations, rôles, facturation, documents, notifications et assistant IA — tout ce qu&apos;il faut pour
          lancer votre produit SaaS sans repartir de zéro.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/register">Créer un compte</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">Se connecter</Link>
          </Button>
        </div>
      </section>

      <section className="border-t bg-muted/30 px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Tout ce qu&apos;il faut pour démarrer</h2>
            <p className="mt-2 text-muted-foreground">Une base solide, déjà en place.</p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <Card key={feature.title}>
                <CardContent className="flex flex-col gap-3 pt-6">
                  <div className="w-fit rounded-lg bg-primary/10 p-2 text-primary">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <p className="font-medium">{feature.title}</p>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {planData.length > 0 && (
        <section className="border-t px-4 py-20">
          <div className="mx-auto max-w-5xl">
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Des tarifs simples</h2>
              <p className="mt-2 text-muted-foreground">
                Commencez gratuitement, changez de plan à tout moment depuis votre espace de facturation.
              </p>
            </div>
            <div className="mt-10">
              <LandingPricing plans={planData} />
            </div>
          </div>
        </section>
      )}

      <section className="border-t px-4 py-20">
        <div className="mx-auto flex max-w-xl flex-col items-center gap-6 text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Prêt à démarrer ?</h2>
          <Button asChild size="lg">
            <Link href="/register">Créer un compte gratuitement</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
