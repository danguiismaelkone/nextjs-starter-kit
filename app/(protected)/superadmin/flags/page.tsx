import Link from "next/link"
import { requireSuperAdmin } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/layout/PageHeader"
import { FeatureFlagToggleList } from "./FeatureFlagToggleList"

interface SuperadminFlagsPageProps {
  searchParams: Promise<{ org?: string; q?: string }>
}

/**
 * Console super-admin — feature flags (ITEM-052). Catalogue `FeatureFlag`
 * défini par le seed (pas de création depuis cette UI, seulement
 * l'activation par organisation, cf. critères d'acceptation) ; recherche
 * d'organisation puis bascule par flag, comme `/superadmin/users?org=`.
 */
export default async function SuperadminFlagsPage({ searchParams }: SuperadminFlagsPageProps) {
  await requireSuperAdmin()
  const { org, q = "" } = await searchParams

  const flags = await prisma.featureFlag.findMany({ orderBy: { key: "asc" } })

  const organizations = q
    ? await prisma.organization.findMany({
        where: { name: { contains: q, mode: "insensitive" } },
        orderBy: { name: "asc" },
        take: 20,
      })
    : []

  const selectedOrganization = org ? await prisma.organization.findUnique({ where: { id: org } }) : null

  const enabledRows = selectedOrganization
    ? await prisma.organizationFeatureFlag.findMany({
        where: { organizationId: selectedOrganization.id },
        select: { key: true, enabled: true },
      })
    : []
  const enabledByKey = new Map(enabledRows.map((row) => [row.key, row.enabled]))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Super-admin — Feature flags"
        description={
          <Link href="/superadmin" className="underline underline-offset-4">
            Organisations
          </Link>
        }
      />

      <form method="get" className="flex gap-2">
        <Input name="q" placeholder="Rechercher une organisation" defaultValue={q} className="max-w-sm" />
        <Button type="submit" variant="outline">
          Rechercher
        </Button>
      </form>

      {q && (
        <div className="divide-y rounded-lg border">
          {organizations.length === 0 && (
            <p className="p-3 text-sm text-muted-foreground">Aucune organisation trouvée.</p>
          )}
          {organizations.map((organization) => (
            <Link
              key={organization.id}
              href={`/superadmin/flags?org=${organization.id}`}
              className="block p-3 text-sm hover:bg-accent"
            >
              {organization.name} <span className="text-muted-foreground">/{organization.slug}</span>
            </Link>
          ))}
        </div>
      )}

      {selectedOrganization ? (
        <>
          <p className="text-sm text-muted-foreground">
            Organisation sélectionnée :{" "}
            <span className="font-medium text-foreground">{selectedOrganization.name}</span>
          </p>
          <FeatureFlagToggleList
            organizationId={selectedOrganization.id}
            flags={flags.map((flag) => ({
              key: flag.key,
              description: flag.description,
              enabled: enabledByKey.get(flag.key) ?? false,
            }))}
          />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Recherchez une organisation ci-dessus, ou passez par le lien « Flags » depuis la liste des{" "}
          <Link href="/superadmin" className="underline underline-offset-4">
            organisations
          </Link>
          .
        </p>
      )}
    </div>
  )
}
