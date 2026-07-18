"use server"

import { getSession } from "@/lib/auth"
import { hasPermission } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import type { DataTablePage } from "@/components/data-table/DataTable"
import { AUDIT_PAGE_SIZE } from "./page-size"

export interface AuditEntryRow {
  id: string
  createdAt: Date
  actorId: string
  actorName: string | null
  action: string
  targetType: string
  targetId: string
}

/**
 * Page du journal d'audit d'une organisation (ITEM-061, pagination serveur) —
 * `organizationId`/`action`/`actorId` liés via `.bind(null, ...)` côté page
 * (Server Component) avant d'être passés au `DataTable` (Client Component),
 * donc jamais falsifiables depuis le client.
 */
export async function getAuditPageAction(
  organizationId: string,
  action: string,
  actorId: string,
  page: number
): Promise<DataTablePage<AuditEntryRow>> {
  const session = await getSession()
  if (!session?.user) return { data: [], total: 0 }

  const allowed = await hasPermission(session.user.id, organizationId, "admin", "access")
  if (!allowed) return { data: [], total: 0 }

  const where = {
    organizationId,
    ...(action ? { action } : {}),
    ...(actorId ? { actorId } : {}),
  }

  const [entries, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (Math.max(1, page) - 1) * AUDIT_PAGE_SIZE,
      take: AUDIT_PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
  ])

  const actors = await prisma.user.findMany({
    where: { id: { in: [...new Set(entries.map((entry) => entry.actorId))] } },
    select: { id: true, name: true },
  })
  const nameByActorId = new Map(actors.map((actor) => [actor.id, actor.name]))

  return {
    data: entries.map((entry) => ({
      id: entry.id,
      createdAt: entry.createdAt,
      actorId: entry.actorId,
      actorName: nameByActorId.get(entry.actorId) ?? null,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
    })),
    total,
  }
}
