---
id: ITEM-067
title: Export d'audit et conformité (Enterprise)
status: implemented
priority: P3
type: feature
estimate: S
depends_on: [ITEM-051]
created: 2026-07-16
updated: 2026-07-17
---

## Idée / contexte
Le journal d'audit (ITEM-051) est consultable en ligne, mais les clients Enterprise ont
souvent des obligations de conformité nécessitant un export archivable.

## User story
En tant qu'admin d'une organisation Enterprise, je veux exporter le journal d'audit sur
une période donnée, afin de répondre à des exigences de conformité internes ou
réglementaires.

## Critères d'acceptation
- [x] Export CSV/JSON du journal d'audit (ITEM-051) filtré par période, réservé aux
      plans Enterprise.
- [x] L'export lui-même est journalisé comme action d'audit (qui a exporté quoi,
      quand).

## Notes techniques
`GET /api/audit/export` (route API, pas server action, pour un vrai téléchargement de
fichier avec `Content-Disposition: attachment`) :
- Garde : `requireOrganizationAdmin()` (même convention que `/api/settings/webhooks`,
  owner/admin de l'organisation active) **puis** `isEnterpriseOrganization()`
  (`lib/billing.ts`, ITEM-066) — 403 explicite si l'organisation n'est pas Enterprise,
  vérifié côté serveur et pas seulement caché dans l'UI.
- Filtre par période via `from`/`to` (query params, `lib/validators/audit.ts` —
  `auditExportQuerySchema`) : une date seule (`<input type="date">`, ex. `2026-07-17`)
  est ramenée au début de journée UTC pour `from` et à la fin de journée UTC pour `to`,
  pour que `to` reste inclusif du jour choisi plutôt que de s'arrêter à minuit pile.
  Une valeur avec heure explicite (usage programmatique) est conservée telle quelle.
  `from`/`to` absents = export complet de l'organisation.
- `format=csv` (défaut) ou `format=json` — CSV construit à la main (pas de dépendance
  ajoutée pour un besoin aussi simple), colonnes `createdAt, actorEmail, action,
  targetType, targetId, metadata`, échappement RFC 4180 minimal.
- L'entrée `AuditLog` (`action: "audit.exported"`, `targetType: "AuditLog"`,
  `targetId: <organizationId>` — pas d'entité unique ciblée par un export) est écrite
  **avant** la réponse, avec `metadata: { format, from, to, count }` : "qui" vient de
  `actorId`, "quand" de `createdAt`, "quoi" du reste des métadonnées. Écrite même si
  `count` est 0 (c'est l'action d'export elle-même qui doit être traçable).
- UI minimale sur `/settings/audit` (`app/(protected)/settings/audit/page.tsx`) : deux
  champs de date + deux boutons "Exporter (CSV)"/"Exporter (JSON)" (formulaire GET
  natif vers la route, pas de JS) — affichés uniquement si `isEnterpriseOrganization`,
  sinon mention "réservé au plan Enterprise" (même schéma d'upsell que `/roles`,
  ITEM-066). Non explicitement listée dans les critères mais nécessaire pour que la
  fonctionnalité soit atteignable sans connaître l'URL de l'API à la main.

Fichiers : `app/api/audit/export/route.ts` (nouveau), `lib/validators/audit.ts`
(nouveau), `lib/audit-labels.ts` (`audit.exported`),
`app/(protected)/settings/audit/page.tsx`.

Vérifications effectuées : `npx tsc --noEmit`, `npx eslint` (fichiers touchés),
`npx vitest run` (41 tests, inchangés), `npx next build` (`/api/audit/export` listée).

## Captures attendues
Fichier CSV/JSON exporté contenant les entrées de la période sélectionnée ; refus
(403) pour une organisation hors plan Enterprise ; entrée `audit.exported` visible
dans le journal après un export.

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-17 (implement) — démarrage
- 2026-07-17 (implement) — implémenté : route `GET /api/audit/export` (CSV/JSON,
  filtrée par période, gardée par `isEnterpriseOrganization`), journalisation de
  l'export lui-même (`audit.exported`), UI d'accès sur `/settings/audit`. Fichiers :
  app/api/audit/export/route.ts, lib/validators/audit.ts, lib/audit-labels.ts,
  app/(protected)/settings/audit/page.tsx.
