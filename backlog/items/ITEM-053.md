---
id: ITEM-053
title: API REST publique versionnée (v1)
status: implemented
priority: P2
type: feature
estimate: M
depends_on: [ITEM-047]
created: 2026-07-16
updated: 2026-07-16
---

## Idée / contexte
Avec les clés API en place (ITEM-047), il faut réellement exposer une API pour que les
clients intègrent la plateforme à leurs outils.

## User story
En tant que client développeur, je veux une API REST documentée et stable, afin
d'intégrer mes propres outils à la plateforme.

## Critères d'acceptation
- [x] Routes `app/api/v1/*` exposent au minimum la lecture des ressources principales
      (users, documents) avec authentification par clé API (ITEM-047).
- [x] Chaque réponse suit un format JSON cohérent (enveloppe `data`/`error`, pagination
      standard).
- [x] Une page `/docs` ou un fichier OpenAPI décrit les endpoints disponibles.

## Notes techniques
Fichiers : `app/api/v1/*`, `lib/api-auth.ts`, `lib/api-response.ts`, `app/docs/page.tsx`.

Décisions à l'implémentation :
- **`lib/api-auth.ts`** — `requireApiKeyAuth(request)` lit l'en-tête
  `Authorization: Bearer sk_...` et délègue à `verifyApiKey()` (ITEM-047, déjà conçu
  pour ce point d'entrée). Retourne une union discriminée `{ok:true, organizationId,
  apiKeyId} | {ok:false, status, code, message}`, même style que
  `requireOrganizationAdmin()` (`lib/organization.ts`) — un rejet (401) ne distingue
  pas volontairement clé absente / invalide / révoquée dans le message exposé, pour ne
  pas donner d'information à un attaquant.
- **`lib/api-response.ts`** — enveloppe cohérente sur toute l'API v1 : succès
  `{ data, meta? }`, erreur `{ error: { code, message } }`. `parsePagination()` lit
  `?page=&perPage=` (défaut 20, plafond 100) et calcule `skip/take` ; c'est la première
  pagination standard du projet (le reste du code utilise des `take` fixes sans
  page/offset) — introduite ici car le critère d'acceptation l'exige explicitement pour
  une API publique consommée par des tiers.
- **Ressources exposées en lecture seule (GET)** : `/api/v1/users` (membres actifs de
  l'organisation propriétaire de la clé, via `Membership` → `User`, jamais tous les
  users de la plateforme) et `/api/v1/documents` (non supprimés,
  `deletedAt: null`, jamais `storageKey`/OCR/résumé bruts). Écriture (POST/PATCH/DELETE)
  hors périmètre — non demandée par les critères, à traiter en item dédié si besoin.
- **Pas de nouvelle dépendance** (pas de zod/OpenAPI generator) : le repo n'utilise déjà
  aucune validation de schéma runtime, donc la spec OpenAPI 3.0 (`GET
  /api/v1/openapi.json`) est écrite à la main (objet TS statique) plutôt que générée,
  pour rester cohérent avec l'absence de zod ailleurs dans le projet.
- **`/docs`** est une page publique (hors `app/(protected)`, pas de vérification de
  session) qui explique l'authentification, le format des réponses, liste les
  endpoints et pointe vers `/api/v1/openapi.json`.
- Vérifié en dev avec une vraie organisation/clé API (créée via `lib/api-keys.ts`
  directement, hors UI) : requête sans en-tête → 401 `unauthorized` ; clé bidon → 401 ;
  clé valide → 200 avec enveloppe `data`/`meta` correcte sur `/api/v1/users` et
  `/api/v1/documents` (liste et item, 404 `not_found` sur id inexistant) ; clé révoquée
  (`revokeApiKey`) → 401 immédiat sur un appel suivant, confirmant le critère 3
  d'ITEM-047 au niveau de la véritable route HTTP publique. `/docs` et
  `/api/v1/openapi.json` répondent 200. `tsc --noEmit` et `eslint` passent. Clé de test
  supprimée après vérification.

## Captures attendues
Appel `curl` avec clé API retournant une réponse JSON conforme au format documenté.
Vérifié fonctionnellement en dev via `curl` (voir Notes techniques : 401 sans clé/clé
invalide, 200 avec enveloppe `data`/`meta`, 404 sur ressource inconnue, 401 immédiat
après révocation) ; une capture d'écran de `/docs` reste à faire par `backlog-test`.

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-16 (implement) — démarrage
- 2026-07-16 (implement) — implémenté : `lib/api-auth.ts` (`requireApiKeyAuth`,
  Bearer → `verifyApiKey`), `lib/api-response.ts` (enveloppe `data`/`error` +
  pagination `page`/`perPage`), routes `app/api/v1/users/route.ts` (+ `[id]`) et
  `app/api/v1/documents/route.ts` (+ `[id]`) en lecture seule scopées à l'organisation
  de la clé API, `app/api/v1/openapi.json/route.ts` (spec OpenAPI 3.0 statique),
  page publique `app/docs/page.tsx`. Fichiers : `lib/api-auth.ts`,
  `lib/api-response.ts`, `app/api/v1/users/route.ts`,
  `app/api/v1/users/[id]/route.ts`, `app/api/v1/documents/route.ts`,
  `app/api/v1/documents/[id]/route.ts`, `app/api/v1/openapi.json/route.ts`,
  `app/docs/page.tsx`. `tsc --noEmit` et `eslint` passent ; vérifié fonctionnellement
  en dev via `curl` (voir Notes techniques).
