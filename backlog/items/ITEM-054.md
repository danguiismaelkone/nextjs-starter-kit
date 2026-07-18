---
id: ITEM-054
title: Rate limiting sur l'API publique
status: implemented
priority: P2
type: feature
estimate: S
depends_on: [ITEM-053]
created: 2026-07-16
updated: 2026-07-16
---

## Idée / contexte
Une API publique sans limite de débit (ITEM-053) est vulnérable aux abus et peut
dégrader le service pour tous les clients.

## User story
En tant que plateforme, je veux limiter le nombre de requêtes par clé API, afin
d'éviter les abus et protéger la disponibilité du service.

## Critères d'acceptation
- [x] Chaque requête sur `app/api/v1/*` est comptabilisée par clé API sur une fenêtre
      glissante (ex. 100 req/min), avec en-têtes `X-RateLimit-*` dans la réponse.
- [x] Dépasser la limite retourne un `429 Too Many Requests` explicite plutôt qu'une
      erreur générique.
- [x] La limite est configurable par plan de facturation (ITEM-020) pour différencier
      les tiers.

## Notes techniques
Fichiers : `lib/rate-limit.ts`, `prisma/schema.prisma` (`Plan.rateLimitPerMinute`),
`prisma/seed.ts`, `app/api/v1/users/route.ts` (+ `[id]`),
`app/api/v1/documents/route.ts` (+ `[id]`), `app/api/v1/openapi.json/route.ts`,
`app/docs/page.tsx`.

Décisions à l'implémentation :
- **`Plan.rateLimitPerMinute Int @default(60)`** — nouveau champ (migration
  `20260716195542_add_plan_rate_limit`) plutôt que de réutiliser `Plan.features`
  (`Json` de puces marketing d'affichage, pas structuré). Résolu via
  `Subscription.organizationId → Subscription.planId → Plan`, avec repli à 60 req/min
  (`DEFAULT_LIMIT_PER_MINUTE`) pour une organisation sans abonnement ou en essai sans
  plan choisi (`planId: null`, ITEM-024). Seed : Starter = 60, Pro = 300 req/min ;
  `ensurePlans()` met désormais à jour `rateLimitPerMinute` sur un plan déjà seedé
  (pas seulement à la création), pour que les bases seedées avant cet item se
  resynchronisent au prochain `pnpm reset`/`prisma db seed`.
- **Compteur en mémoire par `apiKeyId`** (fenêtre glissante réelle, timestamps filtrés
  à chaque appel) — aucune infra Redis/cache partagé dans ce starter kit (confirmé :
  pas de service Redis dans `docker-compose.yml`, pas de client `ioredis`/`@upstash`
  en dépendance). Limite explicitement documentée dans `lib/rate-limit.ts` : fiable
  pour un seul process, ne survit pas à un redémarrage, non partagé entre plusieurs
  instances — acceptable pour ce périmètre, une vraie prod multi-instance nécessiterait
  un store partagé.
- **Quota unique par clé API sur l'ensemble d'`app/api/v1/*`** (pas par route) — une
  clé épuisée sur `/documents` est aussi bloquée sur `/users`, cohérent avec la
  sémantique « limite de débit de la clé », vérifié fonctionnellement (voir ci-dessous).
- **En-têtes sur toutes les réponses authentifiées**, succès *et* erreurs (401 lu avant
  le check de rate limit donc sans en-têtes ; 404/429 après, donc avec) — `lib/api-response.ts`
  n'a pas été modifié (pas d'option headers), `withRateLimitHeaders()` enveloppe la
  `NextResponse` déjà construite dans chacune des 4 routes.
  `app/api/v1/openapi.json/route.ts` documente les en-têtes et la réponse 429 ;
  `/docs` explique la fenêtre glissante et l'en-tête `Retry-After`.
- Vérifié en dev avec une vraie organisation/clé API et un plan de test à
  `rateLimitPerMinute: 3` (créé/détruit via script, hors UI) : 3 premières requêtes
  → 200 avec `X-RateLimit-Remaining` décroissant (2, 1, 0), 4e requête → 429
  `rate_limited` avec `Retry-After` et `X-RateLimit-*` cohérents ; requête sur
  `/documents` avec la même clé déjà épuisée → 429 (quota partagé) ; changement du
  plan de l'organisation vers Pro (300 req/min) sans régénérer de clé → requête
  suivante immédiatement à 200 avec `X-RateLimit-Limit: 300`, confirmant la
  différenciation par plan en temps réel. `tsc --noEmit` et `eslint` passent ; plan
  et clé de test supprimés, abonnement de l'organisation restauré après vérification.

## Captures attendues
Réponse `429` avec en-têtes `X-RateLimit-*` après dépassement du quota en test.
Vérifié fonctionnellement en dev via `curl` (voir Notes techniques : décompte,
429 + `Retry-After`, quota partagé entre endpoints, changement de limite en direct
au changement de plan) ; une capture d'écran de la section « Limite de débit » sur
`/docs` reste à faire par `backlog-test`.

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-16 (implement) — démarrage
- 2026-07-16 (implement) — implémenté : `Plan.rateLimitPerMinute` (migration +
  seed Starter/Pro différenciés), `lib/rate-limit.ts` (`checkRateLimit`,
  `withRateLimitHeaders`, `rateLimitExceededResponse` — fenêtre glissante en mémoire
  par clé API), câblage dans les 4 routes `app/api/v1/{users,documents}[/[id]]/route.ts`
  (check juste après `requireApiKeyAuth`, en-têtes sur toutes les réponses), mise à
  jour d'`app/api/v1/openapi.json/route.ts` et `app/docs/page.tsx` pour documenter
  la limite et la réponse 429. Fichiers : `prisma/schema.prisma`,
  `prisma/migrations/20260716195542_add_plan_rate_limit/`, `prisma/seed.ts`,
  `lib/rate-limit.ts`, `app/api/v1/users/route.ts`, `app/api/v1/users/[id]/route.ts`,
  `app/api/v1/documents/route.ts`, `app/api/v1/documents/[id]/route.ts`,
  `app/api/v1/openapi.json/route.ts`, `app/docs/page.tsx`. `tsc --noEmit` et `eslint`
  passent ; vérifié fonctionnellement en dev via `curl` avec un plan de test à limite
  basse (voir Notes techniques).
