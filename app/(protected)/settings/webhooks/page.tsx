import { redirect } from "next/navigation"
import { requireOrganization } from "@/lib/organization"
import { listWebhooks } from "@/lib/webhooks"
import { WebhooksSection } from "@/components/settings/WebhooksSection"
import { PageHeader } from "@/components/layout/PageHeader"

export default async function WebhooksSettingsPage() {
  const organization = await requireOrganization()

  // Seuls owner/admin de l'organisation gèrent les webhooks — même règle que
  // les clés API (ITEM-047) et les paramètres d'organisation.
  if (organization.role !== "owner" && organization.role !== "admin") redirect("/dashboard")

  const webhooks = await listWebhooks(organization.id)

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader
        title="Webhooks"
        description={`Recevez en temps réel les événements de ${organization.name} sur vos propres systèmes.`}
      />

      <WebhooksSection
        // Jamais `secret` ici : seule la révélation à la création l'expose.
        initialWebhooks={webhooks.map((webhook) => ({
          id: webhook.id,
          url: webhook.url,
          events: webhook.events,
          enabled: webhook.enabled,
          createdAt: webhook.createdAt.toISOString(),
          createdByName: webhook.createdBy?.name ?? null,
        }))}
      />
    </div>
  )
}
