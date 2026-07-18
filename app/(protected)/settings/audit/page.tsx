import Link from "next/link"
import { requireAdmin } from "@/lib/authorization"
import { requireOrganization } from "@/lib/organization"
import { isEnterpriseOrganization } from "@/lib/billing"
import { prisma } from "@/lib/prisma"
import { AUDIT_ACTION_LABELS } from "@/lib/audit"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/layout/PageHeader"
import { AuditDataTable } from "./AuditDataTable"
import { getAuditPageAction } from "./actions"
import { AUDIT_PAGE_SIZE } from "./page-size"

const SELECT_CLASSNAME =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"

interface AuditPageProps {
  searchParams: Promise<{ action?: string; actorId?: string }>
}

/**
 * Journal d'audit de l'organisation active (ITEM-051) — append-only : aucune
 * action de modification/suppression n'est proposée ici, `lib/audit.ts#logAudit`
 * est la seule écriture possible sur `AuditLog`. Inclut les actions
 * super-admin ciblant des comptes de cette organisation (suspension,
 * impersonation — ITEM-050), journalisées sous cette même organisation.
 */
export default async function AuditPage({ searchParams }: AuditPageProps) {
  await requireAdmin()
  const organization = await requireOrganization()
  const { action = "", actorId = "" } = await searchParams

  const where = {
    organizationId: organization.id,
    ...(action ? { action } : {}),
    ...(actorId ? { actorId } : {}),
  }

  const [entries, total, actionRows, actorRows, enterprise] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: AUDIT_PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where: { organizationId: organization.id },
      distinct: ["action"],
      select: { action: true },
      orderBy: { action: "asc" },
    }),
    prisma.auditLog.findMany({
      where: { organizationId: organization.id },
      distinct: ["actorId"],
      select: { actorId: true },
    }),
    isEnterpriseOrganization(organization.id),
  ])

  const actors = await prisma.user.findMany({
    where: { id: { in: actorRows.map((row) => row.actorId) } },
    select: { id: true, name: true, email: true },
  })
  const actorById = new Map(actors.map((actor) => [actor.id, actor]))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Journal d'audit"
        description={`Actions sensibles effectuées sur ${organization.name} — permissions, comptes, facturation.`}
      />

      <form method="get" className="flex flex-wrap items-center gap-2">
        <select name="action" defaultValue={action} className={SELECT_CLASSNAME}>
          <option value="">Toutes les actions</option>
          {actionRows.map((row) => (
            <option key={row.action} value={row.action}>
              {AUDIT_ACTION_LABELS[row.action] ?? row.action}
            </option>
          ))}
        </select>
        <select name="actorId" defaultValue={actorId} className={SELECT_CLASSNAME}>
          <option value="">Tous les utilisateurs</option>
          {actorRows.map((row) => {
            const actor = actorById.get(row.actorId)
            return (
              <option key={row.actorId} value={row.actorId}>
                {actor ? `${actor.name} (${actor.email})` : "Utilisateur supprimé"}
              </option>
            )
          })}
        </select>
        <Button type="submit" variant="outline">
          Filtrer
        </Button>
        {(action || actorId) && (
          <Button asChild variant="ghost">
            <Link href="/settings/audit">Réinitialiser</Link>
          </Button>
        )}
      </form>

      {enterprise ? (
        <form
          action="/api/audit/export"
          method="get"
          className="flex flex-wrap items-end gap-2 rounded-lg border p-3"
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="export-from" className="text-xs text-muted-foreground">
              Du
            </label>
            <input id="export-from" type="date" name="from" className={SELECT_CLASSNAME} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="export-to" className="text-xs text-muted-foreground">
              Au
            </label>
            <input id="export-to" type="date" name="to" className={SELECT_CLASSNAME} />
          </div>
          <Button type="submit" name="format" value="csv" variant="outline">
            Exporter (CSV)
          </Button>
          <Button type="submit" name="format" value="json" variant="outline">
            Exporter (JSON)
          </Button>
        </form>
      ) : (
        <p className="text-xs text-muted-foreground">Export CSV/JSON réservé au plan Enterprise.</p>
      )}

      <AuditDataTable
        initialEntries={entries.map((entry) => ({
          id: entry.id,
          createdAt: entry.createdAt,
          actorId: entry.actorId,
          actorName: actorById.get(entry.actorId)?.name ?? null,
          action: entry.action,
          targetType: entry.targetType,
          targetId: entry.targetId,
        }))}
        initialTotal={total}
        pageSize={AUDIT_PAGE_SIZE}
        fetchPage={getAuditPageAction.bind(null, organization.id, action, actorId)}
      />
    </div>
  )
}
