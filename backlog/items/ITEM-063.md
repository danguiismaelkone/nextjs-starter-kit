---
id: ITEM-063
title: Health checks et alertes
status: implemented
priority: P2
type: feature
estimate: S
depends_on: [ITEM-062]
created: 2026-07-16
updated: 2026-07-16
---

## Idée / contexte
Avec des composants externes critiques (base de données, stockage S3, Stripe), l'équipe
ops a besoin d'un signal de santé exploitable et d'être alertée sans surveiller les logs
en permanence (ITEM-062).

## User story
En tant qu'équipe ops, je veux un endpoint de santé et des alertes automatiques, afin
d'être notifié dès qu'un composant critique devient indisponible.

## Critères d'acceptation
- [x] Endpoint `GET /api/health` vérifie la connectivité base de données et stockage,
      retourne un statut agrégé.
- [x] Une alerte (email/Slack) est déclenchée si le health check échoue plusieurs fois
      consécutives.

## Notes techniques
Fichiers : `app/api/health/route.ts`, `app/api/health/route.test.ts`,
`lib/health.ts`, `lib/alerts.ts`, `lib/storage.ts` (`pingStorage`, nouveau),
`.env` (`OPS_ALERT_EMAIL`/`SLACK_ALERT_WEBHOOK_URL`/`HEALTH_ALERT_THRESHOLD`).

Décisions à l'implémentation :
- **Portée des dépendances vérifiées** : base de données + stockage
  uniquement, comme l'exige explicitement le critère 1 — Stripe (mentionné
  dans l'« Idée / contexte » mais absent du critère) volontairement exclu, pas
  de scope creep.
- **`lib/health.ts#runHealthChecks()`** — `prisma.$queryRaw\`SELECT 1\`` (ne
  touche aucune table applicative) et `pingStorage()` (nouveau,
  `lib/storage.ts`, `HeadBucketCommand` — confirme bucket + identifiants sans
  lire/écrire le moindre objet) en parallèle (`Promise.all`, le temps total
  reflète le plus lent des deux, pas leur somme). `timed()` reprend le même
  filet que `app/api/ai/ocr/route.ts` etc. : `err.message` peut être vide
  (`AggregateError` réseau du SDK S3, confirmé en le déclenchant réellement —
  voir Journal) — toujours un message explicite en repli.
- **`lib/alerts.ts#sendAlert()`** — e-mail (`OPS_ALERT_EMAIL`,
  `lib/email.ts#sendEmail`) et Slack (`SLACK_ALERT_WEBHOOK_URL`, webhook
  entrant standard) chacun optionnel/indépendant, même patron « dégrade
  proprement sans configuration » que Stripe/Resend/Firebase/S3/Sentry déjà
  dans ce repo. Toujours journalisée via `logger.error` (ITEM-062,
  `alert: true`) même sans aucun canal configuré — l'alerte reste visible
  dans les logs/le service de tracking plutôt que silencieusement perdue.
- **Compteur d'échecs consécutifs en mémoire** (`app/api/health/route.ts`,
  `consecutiveFailures`/`alertActive`) — même limite documentée que
  `lib/rate-limit.ts` (ITEM-054) : par process serveur, ne survit pas à un
  redémarrage, non partagé entre plusieurs instances. Seuil configurable
  (`HEALTH_ALERT_THRESHOLD`, défaut 3) — un échec isolé (déploiement en cours,
  coupure transitoire) ne déclenche rien, seule une panne qui persiste alerte.
  `alertActive` évite de renvoyer une alerte à chaque échec une fois déjà
  notifié (pas de spam) ; une alerte de **rétablissement** est envoyée quand
  la santé redevient OK après une alerte active — non explicitement demandé
  par le critère 2 mais ajout minime qui évite qu'une équipe ops reste
  bloquée sur un incident déjà résolu.
- **HTTP 200 si tout est OK, 503 sinon** (convention standard de health
  check, exploitable directement par un load balancer/orchestrateur).
- Vérifié fonctionnellement en dev avec une vraie infra (Postgres local +
  MinIO réel, pas de mock) : état sain → 200 avec les deux checks `ok` et des
  latences réelles ; MinIO arrêté (`docker compose stop minio`, panne
  simulée) → 503 avec `storage: error`, 3 appels consécutifs → alerte
  déclenchée exactement au 3ème (confirmé dans les logs structurés), 4ème
  appel → pas de nouvelle alerte (dédoublonnage `alertActive` confirmé) ;
  MinIO redémarré → 200 + alerte de rétablissement envoyée. Un premier essai a
  révélé un `error: ""` vide (AggregateError réseau du SDK S3) — corrigé avec
  le filet déjà standard dans ce repo, re-vérifié après correction. `tsc
  --noEmit`, `eslint .`, `pnpm test` (37/37, dont 5 nouveaux tests
  `app/api/health/route.test.ts` couvrant seuil/dédoublonnage/rétablissement)
  et `next build` (production) tous clean.

## Suggestion hors périmètre
`consecutiveFailures`/`alertActive` en mémoire de process ne fonctionnent
correctement qu'en single-instance. Un déploiement multi-instance/serverless
voudrait soit un compteur partagé (Redis, base de données), soit déléguer
entièrement la logique "N échecs consécutifs" à un service de supervision
externe (uptime monitor) qui appelle `/api/health` et gère lui-même le seuil —
`/api/health` resterait alors la seule source de vérité sur l'état courant.
Hors périmètre de cet item (estimate S, mono-instance assumé comme pour
ITEM-054).

## Captures attendues
Réponse JSON de `/api/health` avec statut de chaque dépendance ; alerte reçue après
simulation de panne. Vérifié en dev (voir Journal) : réponses JSON réelles capturées
pour l'état sain et l'état en panne, alerte confirmée dans les logs structurés après 3
échecs consécutifs (MinIO arrêté), pas de compte e-mail/Slack réel disponible dans cet
environnement pour capturer une alerte reçue de bout en bout — `logger.error` avec
`alert: true` fait foi du déclenchement.

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-17 (implement) — démarrage
- 2026-07-17 (implement) — implémenté : `lib/health.ts` (`runHealthChecks` — DB
  + stockage en parallèle), `lib/alerts.ts` (`sendAlert`, e-mail/Slack
  optionnels + toujours journalisé), `pingStorage()` ajouté à `lib/storage.ts`,
  `app/api/health/route.ts` (agrégation OK/503, compteur d'échecs consécutifs
  en mémoire, seuil configurable, dédoublonnage, alerte de rétablissement).
  5 tests (`app/api/health/route.test.ts`). Fichiers listés en Notes
  techniques. Vérifié fonctionnellement en dev avec Postgres + MinIO réels :
  état sain (200), panne simulée réelle — MinIO arrêté — jusqu'à alerte
  déclenchée au 3ème échec consécutif puis alerte de rétablissement au retour
  à la normale (voir Notes techniques pour le détail complet, y compris un bug
  d'erreur vide découvert et corrigé pendant la vérification). `tsc --noEmit`,
  `eslint .`, `pnpm test` (37/37) et `next build` tous clean.
