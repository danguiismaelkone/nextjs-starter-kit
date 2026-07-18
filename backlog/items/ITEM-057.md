---
id: ITEM-057
title: Mise en place des tests unitaires et d'intégration
status: implemented
priority: P1
type: chore
estimate: M
depends_on: []
created: 2026-07-16
updated: 2026-07-16
---

## Idée / contexte
Avec un backlog de cette taille, la logique critique (permissions, facturation) a
besoin d'un filet de tests automatisés pour éviter les régressions silencieuses au fil
des items.

## User story
En tant qu'équipe de développement, je veux une suite de tests automatisés sur la
logique critique, afin de détecter les régressions avant mise en production.

## Critères d'acceptation
- [x] Framework de test (Vitest) configuré, avec au moins les helpers d'autorisation
      (`lib/authorization.ts`, `lib/permissions.ts`) et de facturation couverts.
- [x] Commande `pnpm test` exécute la suite complète en local.
- [x] Un seuil de couverture minimal est défini (indicatif, pas bloquant dans un
      premier temps).

## Notes techniques
Fichiers : `vitest.config.ts`, `lib/permissions.test.ts`, `lib/authorization.test.ts`,
`lib/billing.test.ts`, `package.json` (`test`/`test:watch`/`test:coverage`),
`eslint.config.mjs`.

Décisions à l'implémentation :
- **Vitest** (pas Jest) : plus simple à configurer avec le resolver `@/*` du projet
  (alias unique dans `vitest.config.ts`, pas de config Babel/ts-jest séparée),
  environnement `node` (pas `jsdom` — ces tests sont de la logique serveur pure, aucun
  rendu React couvert par cet item).
- **Portée** : `lib/authorization.ts` (`requireAdmin`/`requireSuperAdmin`),
  `lib/permissions.ts` (`hasPermission`/`seedSystemRoles`) et `lib/billing.ts`
  (`startTrialSubscription`, `hasActiveEntitlement`, `upsertSubscriptionFromStripe`,
  `syncSubscriptionFromStripeSubscription`, `recordInvoiceFromStripe`) — 28 tests,
  branches de succès et d'échec pour chacune (accès refusé/accordé, abonnement
  expiré/actif, payload Stripe incomplet, idempotence des upserts). Autorisation et
  facturation explicitement demandées par le critère 1 ; le reste de `lib/` est hors
  périmètre de ce démarrage (voir seuil de couverture ci-dessous).
- **Mocking** : `@/lib/prisma`, `@/lib/stripe`, `@/lib/webhooks`, `@/lib/auth`,
  `@/lib/organization`, `next/navigation` mockés via `vi.mock` — tests unitaires purs,
  aucune base de données ni appel réseau réel. `redirect()` mocké pour lever une
  erreur sentinelle (`REDIRECT:<url>`) plutôt que de réellement interrompre le
  rendu (comportement Next.js réel non reproductible hors requête HTTP), ce qui
  permet d'asserter la destination de redirection via `rejects.toThrow(...)`.
- **Seuil de couverture indicatif, non bloquant** : `vitest.config.ts` définit
  `coverage.include: ["lib/**/*.ts"]` avec reporters `text`/`html`, **sans**
  `coverage.thresholds` — un seuil configuré via cette option ferait échouer
  `pnpm test:coverage` (exit code non nul), ce qui contredit explicitement le critère
  3 (« indicatif, pas bloquant »). Le seuil cible (15 % sur `lib/**`, mesuré à ~9 %
  actuellement puisque seuls 3 fichiers sur ~35 sont couverts) est documenté en
  commentaire dans `vitest.config.ts` plutôt qu'imposé — à faire évoluer en seuil
  bloquant une fois la couverture élargie à d'autres modules.
- `eslint.config.mjs` : ajout de `coverage/**` aux ignores (le rapport HTML généré
  contenait un fichier `block-navigation.js` avec une directive
  `eslint-disable` qui déclenchait un avertissement `eslint` une fois `coverage/`
  généré localement — déjà dans `.gitignore`, jamais commité).
- **Effet de bord découvert pendant l'implémentation** : l'ajout de `vitest`/
  `@vitest/coverage-v8` comme nouvelle dépendance a changé le hash du virtual store
  pnpm, invalidant le client Prisma déjà généré (`tsc --noEmit` a temporairement
  cassé avec des erreurs `Module "@prisma/client" has no exported member
  'PrismaClient'` sur tout le repo) — résolu par `prisma generate`. Sans lien avec
  cet item, mais à surveiller après tout ajout de dépendance : regénérer le client
  Prisma si `tsc` échoue soudainement sur des imports `@prisma/client`.
- Vérifié : `pnpm test` (28/28 passants), `pnpm test:coverage` (rapport texte +
  HTML, exit 0), `tsc --noEmit`, `eslint .` et `next build` (production) tous
  clean après les correctifs ci-dessus.

## Captures attendues
N/A (sortie de `pnpm test` en console montrant les tests passants). Vérifié : 3
fichiers de test, 28 tests passants, sortie capturée dans le Journal.

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-16 (implement) — démarrage
- 2026-07-16 (implement) — implémenté : `vitest` + `@vitest/coverage-v8` installés,
  `vitest.config.ts` (environnement node, alias `@/*`, coverage `lib/**` sans seuil
  bloquant), `lib/permissions.test.ts` (6 tests : `hasPermission`, `seedSystemRoles`),
  `lib/authorization.test.ts` (7 tests : `requireAdmin`, `requireSuperAdmin`),
  `lib/billing.test.ts` (15 tests : essai gratuit, entitlement, sync
  abonnement/facture Stripe), scripts `pnpm test`/`test:watch`/`test:coverage`.
  Fichiers : `vitest.config.ts`, `lib/permissions.test.ts`,
  `lib/authorization.test.ts`, `lib/billing.test.ts`, `package.json`,
  `eslint.config.mjs`. `pnpm test` (28/28), `tsc --noEmit`, `eslint` et `next build`
  passent tous sans erreur.
