import Link from "next/link"
import { requireSuperAdmin } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PageHeader } from "@/components/layout/PageHeader"

const PAGE_SIZE = 10

const SUBSCRIPTION_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  active: { label: "Actif", className: "bg-green-100 text-green-700 border-green-200" },
  trialing: { label: "Essai", className: "bg-blue-100 text-blue-700 border-blue-200" },
  past_due: { label: "Paiement en retard", className: "bg-amber-100 text-amber-700 border-amber-200" },
  canceled: { label: "Annulé", className: "bg-gray-100 text-gray-600 border-gray-200" },
  expired: { label: "Expiré", className: "bg-gray-100 text-gray-600 border-gray-200" },
}

interface SuperadminOrganizationsPageProps {
  searchParams: Promise<{ q?: string; page?: string }>
}

/**
 * Console super-admin — organisations (ITEM-050). Vue plateforme en lecture
 * (statut d'abonnement, ITEM-020) : la suspension/réactivation de compte et
 * l'impersonation se font depuis `/superadmin/users` (le plugin Better Auth
 * `admin` opère sur des `User`, pas des `Organization`) — le lien "Membres" de
 * chaque ligne y renvoie, filtré sur l'organisation.
 */
export default async function SuperadminOrganizationsPage({ searchParams }: SuperadminOrganizationsPageProps) {
  await requireSuperAdmin()
  const { q = "", page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)

  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { slug: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {}

  const [organizations, total] = await Promise.all([
    prisma.organization.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        // L'abonnement est rattaché à l'owner de l'organisation (ITEM-094),
        // pas à l'organisation elle-même — résolu ci-dessous via `Membership`.
        memberships: { where: { role: "owner", status: "active" }, select: { userId: true }, take: 1 },
        _count: { select: { memberships: { where: { status: "active" } } } },
      },
    }),
    prisma.organization.count({ where }),
  ])

  const ownerIds = organizations.map((o) => o.memberships[0]?.userId).filter((id): id is string => !!id)
  const subscriptionsByOwnerId = new Map(
    (
      await prisma.subscription.findMany({
        where: { ownerId: { in: ownerIds } },
        include: { plan: true },
      })
    ).map((subscription) => [subscription.ownerId, subscription])
  )

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function buildUrl(targetPage: number) {
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    params.set("page", String(targetPage))
    return `/superadmin?${params.toString()}`
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Super-admin — Organisations"
        description={
          <Link href="/superadmin/users" className="underline underline-offset-4">
            Comptes utilisateurs
          </Link>
        }
      />

      <form method="get" className="flex gap-2">
        <Input name="q" placeholder="Rechercher par nom ou slug" defaultValue={q} className="max-w-sm" />
        <Button type="submit" variant="outline">
          Rechercher
        </Button>
      </form>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organisation</TableHead>
              <TableHead>Abonnement</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Membres</TableHead>
              <TableHead>Créée le</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {organizations.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Aucune organisation trouvée.
                </TableCell>
              </TableRow>
            )}
            {organizations.map((organization) => {
              const subscription = subscriptionsByOwnerId.get(organization.memberships[0]?.userId ?? "")
              const badge = subscription
                ? (SUBSCRIPTION_STATUS_LABELS[subscription.status] ?? SUBSCRIPTION_STATUS_LABELS.active)
                : null
              return (
                <TableRow key={organization.id}>
                  <TableCell>
                    <div className="font-medium">{organization.name}</div>
                    <div className="text-xs text-muted-foreground">/{organization.slug}</div>
                  </TableCell>
                  <TableCell>
                    {badge ? (
                      <Badge variant="outline" className={badge.className}>
                        {badge.label}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Aucun abonnement</Badge>
                    )}
                  </TableCell>
                  <TableCell>{subscription?.plan?.name ?? "—"}</TableCell>
                  <TableCell>{organization._count.memberships}</TableCell>
                  <TableCell>{organization.createdAt.toLocaleDateString("fr-FR")}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/superadmin/users?org=${organization.id}`}>Membres</Link>
                    </Button>
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/superadmin/flags?org=${organization.id}`}>Flags</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {page} / {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Button asChild variant="outline" size="sm">
                <Link href={buildUrl(page - 1)}>Précédent</Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Précédent
              </Button>
            )}
            {page < totalPages ? (
              <Button asChild variant="outline" size="sm">
                <Link href={buildUrl(page + 1)}>Suivant</Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Suivant
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
