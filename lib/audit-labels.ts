/**
 * Libellés d'affichage des actions journalisées (ITEM-051, page
 * `/settings/audit`) — catalogue non exhaustif : une action absente de cette
 * liste s'affiche telle quelle (le journal reste complet même si ce fichier
 * prend du retard sur les actions qui l'alimentent).
 *
 * Fichier séparé de `lib/audit.ts` (ITEM-061) : ce dernier importe `@/lib/prisma`
 * (Prisma/`pg`), qui casse le build s'il est importé — même indirectement pour
 * une seule constante — depuis un Client Component (`AuditDataTable.tsx`).
 */
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  "role.created": "Rôle personnalisé créé",
  "audit.exported": "Export du journal d'audit",
  "role.permission.granted": "Permission accordée à un rôle",
  "role.permission.revoked": "Permission retirée à un rôle",
  "membership.removed": "Membre retiré de l'organisation",
  "api_key.revoked": "Clé API révoquée",
  "webhook.deleted": "Webhook supprimé",
  "billing.plan_changed": "Changement de plan",
  "billing.subscription_canceled": "Résiliation d'abonnement",
  "user.suspended": "Compte suspendu (super-admin)",
  "user.reactivated": "Compte réactivé (super-admin)",
  "user.impersonate_start": "Début d'impersonation (super-admin)",
  "user.impersonate_stop": "Fin d'impersonation (super-admin)",
  "feature_flag.toggled": "Feature flag modifié (super-admin)",
}
