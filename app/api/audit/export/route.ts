import { NextResponse } from "next/server"
import { requireOrganizationAdmin } from "@/lib/organization"
import { isEnterpriseOrganization } from "@/lib/billing"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"
import { parseSearchParams } from "@/lib/validation"
import { auditExportQuerySchema } from "@/lib/validators/audit"

const CSV_COLUMNS = ["createdAt", "actorEmail", "action", "targetType", "targetId", "metadata"] as const

function csvEscape(value: string): string {
  if (!/[",\n]/.test(value)) return value
  return `"${value.replace(/"/g, '""')}"`
}

function toCsv(rows: Record<(typeof CSV_COLUMNS)[number], string>[]): string {
  const lines = [CSV_COLUMNS.join(",")]
  for (const row of rows) {
    lines.push(CSV_COLUMNS.map((column) => csvEscape(row[column])).join(","))
  }
  // \r\n : convention CSV (RFC 4180), pour une compatibilité maximale (Excel etc).
  return lines.join("\r\n")
}

/**
 * Export du journal d'audit (ITEM-067) — réservé aux organisations sur le
 * plan Enterprise (ITEM-066/ITEM-020), en plus du droit owner/admin déjà
 * requis par `requireOrganizationAdmin()` (même garde que les autres routes
 * `/api/settings/*`). Filtré par période via `from`/`to` (ISO 8601), formats
 * `csv` (défaut) ou `json`.
 */
export async function GET(request: Request) {
  const auth = await requireOrganizationAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const enterprise = await isEnterpriseOrganization(auth.organization.id)
  if (!enterprise) {
    return NextResponse.json(
      { error: "L'export du journal d'audit est réservé aux organisations sur le plan Enterprise." },
      { status: 403 }
    )
  }

  const parsed = parseSearchParams(request.url, auditExportQuerySchema)
  if (!parsed.success) return NextResponse.json({ error: parsed.message }, { status: 400 })
  const { from, to, format } = parsed.data

  const entries = await prisma.auditLog.findMany({
    where: {
      organizationId: auth.organization.id,
      ...((from || to) && {
        createdAt: { ...(from && { gte: from }), ...(to && { lte: to }) },
      }),
    },
    orderBy: { createdAt: "desc" },
  })

  const actors = await prisma.user.findMany({
    where: { id: { in: Array.from(new Set(entries.map((entry) => entry.actorId))) } },
    select: { id: true, email: true },
  })
  const actorEmailById = new Map(actors.map((actor) => [actor.id, actor.email]))

  // Journalisé même si `entries` est vide : c'est l'action d'export elle-même
  // (qui, quoi, quand) qui doit être traçable, pas son résultat.
  await logAudit({
    organizationId: auth.organization.id,
    actorId: auth.userId,
    action: "audit.exported",
    targetType: "AuditLog",
    targetId: auth.organization.id,
    metadata: {
      format,
      from: from?.toISOString() ?? null,
      to: to?.toISOString() ?? null,
      count: entries.length,
    },
  })

  const filename = `audit-${auth.organization.slug}-${new Date().toISOString().slice(0, 10)}.${format}`

  if (format === "json") {
    const body = JSON.stringify(
      entries.map((entry) => ({
        id: entry.id,
        createdAt: entry.createdAt.toISOString(),
        actorId: entry.actorId,
        actorEmail: actorEmailById.get(entry.actorId) ?? null,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        metadata: entry.metadata,
      })),
      null,
      2
    )
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  }

  const csv = toCsv(
    entries.map((entry) => ({
      createdAt: entry.createdAt.toISOString(),
      actorEmail: actorEmailById.get(entry.actorId) ?? entry.actorId,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : "",
    }))
  )
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
