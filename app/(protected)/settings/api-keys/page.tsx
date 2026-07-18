import { redirect } from "next/navigation"
import { requireOrganization } from "@/lib/organization"
import { listApiKeys } from "@/lib/api-keys"
import { ApiKeysSection } from "@/components/settings/ApiKeysSection"
import { PageHeader } from "@/components/layout/PageHeader"

export default async function ApiKeysSettingsPage() {
  const organization = await requireOrganization()

  // Seuls owner/admin de l'organisation gèrent les clés API — même règle que
  // les paramètres d'organisation (app/(protected)/settings/organizations/[id]).
  if (organization.role !== "owner" && organization.role !== "admin") redirect("/dashboard")

  const apiKeys = await listApiKeys(organization.id)

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <PageHeader
        title="Clés API"
        description={`Gérez les clés API de ${organization.name} pour intégrer la plateforme à vos outils.`}
      />

      <ApiKeysSection
        initialApiKeys={apiKeys.map((apiKey) => ({
          id: apiKey.id,
          name: apiKey.name,
          prefix: apiKey.prefix,
          createdAt: apiKey.createdAt.toISOString(),
          lastUsedAt: apiKey.lastUsedAt?.toISOString() ?? null,
          revokedAt: apiKey.revokedAt?.toISOString() ?? null,
          createdByName: apiKey.createdBy?.name ?? null,
        }))}
      />
    </div>
  )
}
