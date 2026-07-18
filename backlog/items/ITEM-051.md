---
id: ITEM-051
title: Journal d'audit (AuditLog)
status: implemented
priority: P1
type: feature
estimate: M
depends_on: [ITEM-013]
created: 2026-07-16
updated: 2026-07-16
---

## Idée / contexte
Plusieurs items (ITEM-016, ITEM-019, ITEM-050) référencent une journalisation des
actions sensibles. Il faut poser ce socle d'audit une bonne fois.

## User story
En tant qu'admin d'organisation ou super-admin, je veux consulter un journal des
actions sensibles effectuées, afin de comprendre qui a fait quoi et quand en cas
d'incident.

## Critères d'acceptation
- [x] Modèle `AuditLog` (organizationId, actorId, action, targetType, targetId,
      metadata, createdAt) alimenté par les actions sensibles existantes (changement de
      rôle, suppression, facturation, impersonation).
- [x] Page `/settings/audit` (ou `/superadmin/audit`) liste les entrées avec filtres
      par type d'action et par utilisateur.
- [x] Les entrées d'audit ne sont jamais modifiables ni supprimables depuis l'UI
      (append-only).

## Notes techniques
`AuditLog` (modèle) et `logAudit()` (`lib/audit.ts`) existaient déjà, posés en
fondation par ITEM-019 — le travail de cet item : élargir les points d'écriture
et construire la page de consultation.

**Actions désormais journalisées** (une par catégorie citée dans le critère
d'acceptation, sans ratisser toutes les suppressions de l'app — cf. ci-dessous) :
- Changement de rôle : `role.permission.granted`/`role.permission.revoked`
  (préexistant, ITEM-019, `app/(protected)/roles/[id]/actions.ts`).
- Suppression : `membership.removed` (retrait d'un membre,
  `app/(protected)/admin/users/actions.ts`), `api_key.revoked`
  (`app/api/settings/api-keys/[id]/route.ts`), `webhook.deleted`
  (`app/api/settings/webhooks/[id]/route.ts`).
- Facturation : `billing.plan_changed` (upgrade/downgrade,
  `app/api/billing/change-plan/route.ts`), `billing.subscription_canceled`
  (`app/api/billing/cancel/route.ts`).
- Impersonation : `user.impersonate_start`/`user.impersonate_stop` et
  `user.suspended`/`user.reactivated` (préexistant, ITEM-050,
  `app/(protected)/superadmin/actions.ts`).

Pas de journalisation ajoutée sur les suppressions de documents/dossiers (ITEM-032,
volume routinier, pas une action d'administration) ni sur un changement de
`Membership.role` (aucune UI ne le permet aujourd'hui — constaté en explorant le
code, hors périmètre de cet item de créer cette fonctionnalité).

Libellés d'affichage centralisés dans `AUDIT_ACTION_LABELS` (`lib/audit.ts`) — une
action absente de la liste s'affiche sous sa forme brute (le journal reste complet
même si ce catalogue prend du retard).

Page `/settings/audit` (pas `/superadmin/audit`) : scoped à l'organisation active
via `requireAdmin()`, même garde que les autres pages de `/settings` — inclut aussi
les actions super-admin (suspension/impersonation) ciblant un compte de cette
organisation, journalisées sous l'organisation principale du compte ciblé
(`getPrimaryOrganizationId`, ITEM-050). Filtres par `<select>` natifs (action,
acteur) en GET, pagination identique aux autres listes admin. Append-only : `lib/audit.ts`
n'expose aucune fonction de mise à jour/suppression, et aucune route/action n'en
crée.

Vérifié en local (dev server + Postgres réel) : révocation d'une clé API et
suppression d'un webhook déclenchent bien une entrée, visible et filtrable sur
`/settings/audit`.

Fichiers : `prisma/schema.prisma` (inchangé, modèle déjà posé), `lib/audit.ts`,
`app/(protected)/settings/audit/page.tsx`, `app/(protected)/settings/page.tsx`,
`app/(protected)/admin/users/actions.ts`, `app/api/settings/api-keys/[id]/route.ts`,
`app/api/settings/webhooks/[id]/route.ts`, `app/api/billing/change-plan/route.ts`,
`app/api/billing/cancel/route.ts`.

## Captures attendues
Liste d'entrées d'audit filtrée par type d'action, une action récente (ex. changement
de rôle) visible dans le journal.

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-16 (implement) — démarrage
- 2026-07-16 (implement) — implémenté : page `/settings/audit` (filtres action +
  acteur, pagination), journalisation étendue à la suppression de membre, la
  révocation de clé API, la suppression de webhook et les changements de
  facturation (plan, résiliation). Fichiers : `lib/audit.ts`,
  `app/(protected)/settings/audit/page.tsx`, `app/(protected)/settings/page.tsx`,
  `app/(protected)/admin/users/actions.ts`, `app/api/settings/api-keys/[id]/route.ts`,
  `app/api/settings/webhooks/[id]/route.ts`, `app/api/billing/change-plan/route.ts`,
  `app/api/billing/cancel/route.ts`.
