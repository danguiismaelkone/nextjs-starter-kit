---
id: ITEM-062
title: Logs structurés et tracking d'erreurs
status: implemented
priority: P2
type: chore
estimate: S
depends_on: []
created: 2026-07-16
updated: 2026-07-16
---

## Idée / contexte
Avec des webhooks (ITEM-022), une API publique (ITEM-053) et des Server Actions
multiples, diagnostiquer un incident en production sans logs structurés ni tracking
d'erreurs devient très difficile.

## User story
En tant qu'équipe de développement, je veux des logs structurés et un suivi centralisé
des erreurs, afin de diagnostiquer rapidement les incidents en production.

## Critères d'acceptation
- [x] Les logs applicatifs (Server Actions, routes API, webhooks) utilisent un format
      structuré (JSON) avec niveau de sévérité.
- [x] Les erreurs non gérées sont capturées et remontées à un service de tracking (ex.
      Sentry) avec contexte (utilisateur, organisation, requête).
- [x] Aucune donnée sensible (mot de passe, clé API, token) n'apparaît dans les logs.

## Notes techniques
Fichiers : `lib/logger.ts`, `lib/logger.test.ts`, `lib/error-tracking.ts`,
`instrumentation.ts`, `app/global-error.tsx`, `app/api/client-error/route.ts`,
`lib/validators/client-error.ts`, `.env` (`SENTRY_DSN`), et les 13 fichiers
existants convertis de `console.error`/`console.warn` vers `logger.*` (liste
complète dans le Journal).

Décisions à l'implémentation :
- **`lib/logger.ts`** — `logger.debug/info/warn/error(message, context?)`
  (`error()` prend en plus l'erreur elle-même) émettant une ligne JSON unique
  (`level`, `message`, `timestamp`, `...context`) sur `console.log`/`warn`/`error`
  selon le niveau — un agrégateur de logs de prod (Vercel, Datadog, CloudWatch...)
  capture déjà stdout/stderr par ligne, donc aucune dépendance à un transport de
  logs externe n'a été ajoutée.
- **Rédaction automatique (critère 3)**, pas une simple convention à respecter :
  `redact()` masque récursivement (profondeur bornée, `WeakSet` anti-cycle)
  toute clé dont le nom matche `password|secret|token|api[-_]?key|
  authorization|privatekey` — appliqué à `context` ET à l'argument `error`, à
  tous les niveaux d'imbrication. Une `Error` est sérialisée en
  `{name, message, stack}` plutôt qu'en objet vide (`JSON.stringify(new
  Error())` ne produit rien par défaut). Redaction **par nom de clé**, pas par
  contenu de valeur — un token embarqué dans l'URL d'un e-mail (reset
  password/invitation) ne serait pas détecté par ce mécanisme ; c'est pourquoi
  `lib/email.ts` ne passe jamais `html`/`url` en contexte au logger (voir
  ci-dessous), plutôt que de compter sur la rédaction pour rattraper ce cas.
- **`lib/error-tracking.ts`** — fine couche autour de `@sentry/node` (pas le
  package `@sentry/nextjs` complet : pas de plugin webpack, pas d'upload de
  source maps, pas de fichiers de config supplémentaires — ce dont ce critère a
  besoin, une capture serveur avec contexte, n'exige aucun de ces éléments).
  `initErrorTracking()` ne s'active que si `SENTRY_DSN` est configurée — même
  patron « client paresseux, dégrade proprement » que `getStripeClient()`/
  `getResendClient()` déjà dans ce repo ; aucune clé Sentry n'est disponible
  dans cet environnement (contrairement à Stripe, un compte Sentry ne peut pas
  être auto-provisionné via API), donc jamais testé contre un vrai projet
  Sentry — testé à la place avec une DSN syntaxiquement valide mais fictive
  (`initErrorTracking()` + `reportError()` ne lèvent jamais, y compris quand le
  SDK est réellement actif et que l'envoi réseau échoue en tâche de fond).
- **`instrumentation.ts`** — hook officiel Next.js : `register()` initialise
  Sentry une fois par process serveur, `onRequestError` (API stable Next.js,
  reçoit `(error, request, context)`) capture automatiquement toute erreur non
  interceptée pendant une requête (route API, Server Action, rendu RSC) —
  filet de sécurité pour le critère 2, complémentaire à l'adoption explicite
  de `logger.error()` dans les points d'erreur déjà identifiés. Les deux
  vérifient `NEXT_RUNTIME === "nodejs"` : `@sentry/node` utilise des API Node
  absentes du runtime Edge (`proxy.ts`, ITEM-055).
- **Erreurs de rendu React côté client** (post-hydratation, hors périmètre
  d'`onRequestError` qui ne couvre que le serveur) : `app/global-error.tsx`
  (aucun boundary d'erreur n'existait avant cet item) relaie vers
  `POST /api/client-error` (validé via Zod, ITEM-055) plutôt que d'appeler
  `@sentry/node` directement — ce SDK n'est pas conçu pour tourner dans le
  navigateur. Non authentifié (une erreur peut survenir sur une page publique)
  mais attache `userId` si une session existe.
- **Sévérité choisie au cas par cas**, pas tout en `error` par défaut : les
  échecs *best-effort* qui n'empêchent pas l'opération principale de réussir
  (notification push/e-mail après une action déjà actée, déclenchement de
  webhook sortant, purge d'un objet S3 orphelin, suppression de l'ancien
  avatar) sont en `warn` (journalisés, jamais remontés à Sentry) ; les échecs
  qui font échouer la requête pour l'appelant sont en `error` (remontés). Une
  signature Stripe invalide est en `warn` : bruit/tentatives attendues, pas un
  bug applicatif.
- **`console.log` de prévisualisation dev conservés tels quels**
  (`lib/email.ts`, `lib/push-notifications.ts` — fallback quand
  `RESEND_API_KEY`/Firebase ne sont pas configurées) : ce ne sont pas des logs
  d'erreur/production (jamais déclenchés si les vraies clés sont configurées),
  et l'e-mail affiché contient potentiellement un token de réinitialisation/
  invitation en clair dans l'URL — le faire passer par le logger structuré
  (donc potentiellement vers Sentry) créerait exactement la fuite que le
  critère 3 interdit. Conservés comme utilitaire de dev local uniquement.
- Vérifié fonctionnellement (pas seulement lu) : script direct testant
  `logger.info/warn/error` — rédaction confirmée sur clés au premier niveau et
  imbriquées, sérialisation d'`Error`, aucun crash ; `initErrorTracking()` +
  `reportError()` avec une DSN fictive active — aucune exception ; requêtes
  HTTP réelles contre le serveur dev (`POST /api/webhooks/stripe` mal
  configuré, `POST /api/client-error`) — lignes JSON structurées correctement
  émises dans les logs serveur ; route de test temporaire jetant une erreur
  non interceptée — confirmé qu'`onRequestError` se déclenche bien (marqueur
  de debug retiré après vérification, route de test supprimée). `tsc
  --noEmit`, `eslint .`, `pnpm test` (33/33, dont 5 nouveaux tests
  `lib/logger.test.ts`) et `next build` (production) tous clean.

## Captures attendues
N/A (vérifiable via le tableau de bord du service de tracking après une erreur
provoquée volontairement) — non vérifiable dans cet environnement sans compte
Sentry réel ; vérifié à la place via des logs JSON structurés en sortie serveur
et confirmation que les points d'intégration (`initErrorTracking`/`reportError`/
`onRequestError`) s'exécutent sans erreur (voir Notes techniques et Journal).

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-17 (implement) — démarrage
- 2026-07-17 (implement) — implémenté : `lib/logger.ts` (logger JSON structuré,
  4 niveaux, rédaction récursive par nom de clé), `lib/error-tracking.ts`
  (fine couche `@sentry/node`, conditionnelle à `SENTRY_DSN`),
  `instrumentation.ts` (`register`/`onRequestError`, hook officiel Next.js),
  `app/global-error.tsx` + `app/api/client-error/route.ts` (erreurs de rendu
  React côté client). Converti les 21 appels `console.error`/`console.warn`
  de production vers `logger.*` dans : `app/api/ai/{chat,ocr,summarize}/
  route.ts`, `app/api/documents/generate/route.ts`,
  `app/api/profile/avatar/route.ts` (×3), `app/api/webhooks/stripe/route.ts`
  (×3), `app/invite/accept/actions.ts` (×2), `lib/billing.ts`,
  `lib/documents.ts`, `lib/email.ts` (×2), `lib/notify.ts` (×2),
  `lib/webhooks.ts` — 2 `console.log` de prévisualisation dev volontairement
  laissés tels quels (voir Notes techniques). Ajouté `lib/logger.test.ts` (5
  tests). Fichiers complets listés en Notes techniques. Vérifié
  fonctionnellement : redaction testée directement, requêtes HTTP réelles
  contre le serveur dev produisant des lignes JSON correctes,
  `onRequestError` confirmé déclenché sur une erreur non interceptée réelle
  (route de test temporaire, supprimée après vérification). `tsc --noEmit`,
  `eslint .`, `pnpm test` (33/33) et `next build` tous clean.
