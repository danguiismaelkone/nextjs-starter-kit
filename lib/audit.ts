import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

// Réexporté pour compatibilité avec le code serveur existant qui importait ce
// symbole depuis ce fichier — voir `lib/audit-labels.ts` pour la raison du split.
export { AUDIT_ACTION_LABELS } from "@/lib/audit-labels"

export interface LogAuditParams {
  organizationId: string
  actorId: string
  action: string
  targetType: string
  targetId: string
  metadata?: Prisma.InputJsonValue
}

/**
 * Écrit une entrée dans le journal d'audit — append-only, aucune fonction de
 * mise à jour ou de suppression n'existe dans ce fichier (ITEM-051 : les
 * entrées ne sont jamais modifiables/supprimables depuis l'UI). Consultable
 * sur `/settings/audit`.
 */
export async function logAudit({
  organizationId,
  actorId,
  action,
  targetType,
  targetId,
  metadata,
}: LogAuditParams): Promise<void> {
  await prisma.auditLog.create({
    data: { organizationId, actorId, action, targetType, targetId, metadata },
  })
}
