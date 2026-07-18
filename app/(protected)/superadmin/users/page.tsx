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
import { SuspendUserButton } from "./SuspendUserButton"
import { ImpersonateButton } from "./ImpersonateButton"

const PAGE_SIZE = 10

interface SuperadminUsersPageProps {
  searchParams: Promise<{ q?: string; page?: string; org?: string }>
}

/**
 * Console super-admin — comptes utilisateurs (ITEM-050), plateforme entière
 * (pas scoped à une organisation, contrairement à `admin/users`). Suspension
 * via le plugin Better Auth `admin` (`User.banned`) et impersonation
 * (`Session.impersonatedBy`) — voir `actions.ts`.
 */
export default async function SuperadminUsersPage({ searchParams }: SuperadminUsersPageProps) {
  const session = await requireSuperAdmin()
  const { q = "", page: pageParam, org } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)

  const where = {
    ...(org ? { memberships: { some: { organizationId: org, status: "active" as const } } } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  }

  const [users, total, filteredOrganization] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        memberships: {
          where: { status: "active" },
          take: 1,
          orderBy: { createdAt: "asc" },
          include: { organization: true },
        },
      },
    }),
    prisma.user.count({ where }),
    org ? prisma.organization.findUnique({ where: { id: org } }) : null,
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function buildUrl(targetPage: number) {
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (org) params.set("org", org)
    params.set("page", String(targetPage))
    return `/superadmin/users?${params.toString()}`
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Super-admin — Comptes utilisateurs"
        description={
          <>
            <Link href="/superadmin" className="underline underline-offset-4">
              Organisations
            </Link>
            {filteredOrganization && <> · Filtré sur {filteredOrganization.name}</>}
          </>
        }
      />

      <form method="get" className="flex gap-2">
        {org && <input type="hidden" name="org" value={org} />}
        <Input name="q" placeholder="Rechercher par nom ou e-mail" defaultValue={q} className="max-w-sm" />
        <Button type="submit" variant="outline">
          Rechercher
        </Button>
        {org && (
          <Button asChild variant="ghost">
            <Link href="/superadmin/users">Retirer le filtre</Link>
          </Button>
        )}
      </form>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Organisation</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Créé le</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Aucun utilisateur trouvé.
                </TableCell>
              </TableRow>
            )}
            {users.map((user) => {
              const isSelf = user.id === session.user.id
              return (
                <TableRow key={user.id}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.memberships[0]?.organization.name ?? "—"}</TableCell>
                  <TableCell>
                    {user.role === "superadmin" ? (
                      <Badge>Super-admin</Badge>
                    ) : (
                      <Badge variant="secondary">Utilisateur</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.banned ? "destructive" : "outline"}>
                      {user.banned ? "Suspendu" : "Actif"}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.createdAt.toLocaleDateString("fr-FR")}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {!isSelf && (
                        <SuspendUserButton userId={user.id} userName={user.name} suspended={user.banned} />
                      )}
                      {!isSelf && !user.banned && <ImpersonateButton userId={user.id} userName={user.name} />}
                    </div>
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
