---
id: ITEM-058
title: Tests E2E (Playwright)
status: implemented
priority: P2
type: chore
estimate: M
depends_on: [ITEM-057]
created: 2026-07-16
updated: 2026-07-16
---

## Idée / contexte
Les tests unitaires (ITEM-057) ne couvrent pas les parcours complets utilisateur
(inscription, souscription, upload) qui traversent plusieurs modules du SaaS Core.

## User story
En tant qu'équipe de développement, je veux des tests de bout en bout sur les parcours
critiques, afin de valider le produit dans des conditions proches du réel.

## Critères d'acceptation
- [x] Playwright configuré avec au moins 3 parcours couverts : inscription + création
      d'organisation, souscription à un plan (Stripe test mode), upload de document.
- [x] Les tests E2E tournent contre une base de données de test isolée, sans impacter
      les données de développement.

## Notes techniques
Fichiers : `playwright.config.ts`, `e2e/global-setup.ts`, `e2e/helpers/auth.ts`,
`e2e/signup.spec.ts`, `e2e/billing.spec.ts`, `e2e/documents.spec.ts`,
`e2e/fixtures/test-image.png`, `app/(auth)/register/page.tsx` (bugfix, voir
ci-dessous), `.env` (`SEED_PRO_STRIPE_PRICE_ID`), `.gitignore`, `eslint.config.mjs`,
`package.json` (`test:e2e`).

Décisions à l'implémentation :
- **Isolation de la base (critère 2)** : `e2e/global-setup.ts` dérive
  `<DATABASE_URL>_e2e` (suffixe sur le nom de la base, override possible via
  `E2E_DATABASE_URL`), la crée si absente (`pg` — déjà une dépendance du projet,
  pas de nouvel outil externe requis), puis `prisma migrate deploy` + `prisma db
  seed` dessus. `playwright.config.ts` calcule la même URL via une fonction pure
  partagée (`resolveE2eDatabaseUrl`, exportée par `global-setup.ts`) plutôt que de
  lire une variable posée par `globalSetup` dans `process.env` : la définition du
  `webServer` (dont son `env`) est évaluée à l'import de la config, **avant** que
  `globalSetup` ne s'exécute — une dépendance d'ordre aurait été fragile.
  `webServer.env` surcharge `DATABASE_URL` et `BETTER_AUTH_URL` uniquement (port
  E2E dédié 3100, jamais 3000 — pas de conflit avec un `pnpm dev` local en cours).
  Vérifié : après plusieurs runs, la base de dev (`nextjs_starter_kit`) est restée
  à 3 users (seed initial) pendant que la base E2E (`nextjs_starter_kit_e2e`) en
  accumule un par test (comptes uniques horodatés, jamais de collision entre runs).
- **Stripe test mode réel (critère 1, souscription)** : décision utilisateur après
  clarification — une première proposition (« redirection sans vraie clé Stripe »)
  était en fait irréalisable techniquement (`getStripeClient()` retourne `null`
  sans `STRIPE_SECRET_KEY`, l'app répond 503 avant même d'atteindre Stripe) ; une
  fois cette erreur corrigée dans l'échange, l'utilisateur a fourni une vraie clé
  secrète Stripe test mode. Un Product + Price Stripe de test (29 $US/mois) a été
  créé via l'API Stripe (`stripe.products.create`/`prices.create`, script
  ponctuel) plutôt que de demander à l'utilisateur de le créer manuellement dans
  le dashboard, et son id référencé par `SEED_PRO_STRIPE_PRICE_ID` (nouvelle
  variable, consommée par `prisma/seed.ts` déjà prévu pour ça). Le test
  (`e2e/billing.spec.ts`) clique « Souscrire » sur le plan Pro, attend une vraie
  navigation vers `checkout.stripe.com` (`window.location.href`, pas un routage
  interne — confirmé dans `PlanCard`) et vérifie le montant affiché sur la page
  Stripe elle-même (`$29.00`, présent à plusieurs endroits de leur récapitulatif —
  `.first()`) : preuve que la bonne session (le bon plan) a été créée, pas
  seulement une redirection vers le bon domaine. Le test s'arrête à cette
  vérification — compléter le paiement sur le formulaire hébergé par Stripe
  (produit Stripe, pas du code de l'app) reste hors périmètre.
- **Bug découvert et corrigé pour débloquer le critère 1** (inscription) :
  `app/(auth)/register/page.tsx` enchaînait `router.push("/dashboard")` puis
  `router.refresh()` — `refresh()` appelé juste après `push()` course la
  navigation en cours (il peut re-fetcher les données du segment encore courant
  avant que `push()` n'ait commité le changement de route, annulant silencieusement
  la navigation : reproductible à 100 % en local, page qui reste sur `/register`
  avec un formulaire réinitialisé). Corrigé en retirant le `router.refresh()`
  redondant (une navigation vers une route jamais visitée est déjà rendue à
  neuf par `push()` seul). **Le même motif existe ailleurs** (`login/LoginForm.tsx`,
  `two-factor/TwoFactorVerifyForm.tsx`, `invite/accept/AcceptInvitationForm.tsx`,
  `superadmin/users/ImpersonateButton.tsx`, `layout/ImpersonationBanner.tsx`,
  `documents/GenerateDocumentForm.tsx`) — non corrigé ici (hors périmètre de cet
  item, aucun de ces parcours n'est exercé par les 3 specs E2E requises) ; à
  traiter dans un item dédié (voir suggestion ci-dessous).
- **Sélecteurs** : role/label/texte, jamais de classe CSS — `data-slot="card"`
  (déjà présent dans `components/ui/card.tsx`, convention shadcn) pour scoper la
  bonne carte de plan, car `CardTitle` rend un `<div>` (pas un heading
  sémantique) donc `getByRole("heading", ...)` ne le voit pas. Upload de document
  ciblé directement sur `input[type="file"]` sous-jacent de `react-dropzone`
  plutôt que de simuler un glisser-déposer.
- **1 seul worker** (`workers: 1`) : les 3 specs partagent la même base E2E et le
  même serveur Next — évite toute interférence plutôt que d'isoler par
  worker/base, périmètre jugé suffisant pour 3 parcours.
- Prérequis MinIO pour le parcours document (comme ITEM-056) : `docker compose up
  -d minio` avant `pnpm test:e2e`, arrêté après vérification
  (`docker compose stop minio`, pas de suppression du volume).
- Vérifié : `pnpm test:e2e` — 3/3 passants (voir Journal), avec une vraie clé
  Stripe test mode, un vrai MinIO, une vraie base Postgres isolée. `tsc --noEmit`,
  `eslint .`, `pnpm test` (suite Vitest ITEM-057, non régressée par le fix
  register) et `next build` (production) tous clean après le fix.

## Suggestion hors périmètre
Le motif `router.push(...)` suivi immédiatement de `router.refresh()` (course de
navigation, voir ci-dessus) existe dans 6 autres fichiers en plus de
`register/page.tsx` — proposer un item dédié pour l'auditer/corriger partout
(`login/LoginForm.tsx`, `two-factor/TwoFactorVerifyForm.tsx`,
`invite/accept/AcceptInvitationForm.tsx`, `superadmin/users/ImpersonateButton.tsx`,
`layout/ImpersonationBanner.tsx`, `documents/GenerateDocumentForm.tsx`).

## Captures attendues
N/A (rapport Playwright montrant les 3 parcours passants). Vérifié : `pnpm test:e2e`
→ 3 passed (signup.spec.ts, billing.spec.ts, documents.spec.ts), voir Journal pour le
détail de chaque parcours.

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-17 (implement) — démarrage. Décision initiale (utilisateur) : le parcours
  souscription s'arrête à la redirection vers Stripe Checkout sans vraie clé Stripe.
- 2026-07-17 (implement) — correction : cette première décision était fondée sur une
  erreur de ma part — `getStripeClient()` retourne `null` sans `STRIPE_SECRET_KEY`,
  donc l'app répond 503 avant même d'atteindre Stripe ; aucune redirection réelle
  n'est possible sans clé. Reformulé auprès de l'utilisateur, qui a fourni une vraie
  clé Stripe test mode (`STRIPE_SECRET_KEY` dans `.env`).
- 2026-07-17 (implement) — installé Playwright + Chromium, `playwright.config.ts`
  (port E2E dédié 3100, `globalSetup` pour la base isolée), `e2e/global-setup.ts`
  (dérive/crée/migre/seed `<db>_e2e`), `e2e/helpers/auth.ts` (inscription via l'UI
  réelle). Créé un Product + Price Stripe de test (29 $US/mois) via l'API,
  référencé par `SEED_PRO_STRIPE_PRICE_ID`.
- 2026-07-17 (implement) — débogage : `e2e/signup.spec.ts` échouait de façon
  reproductible (navigation vers `/dashboard` jamais commitée après inscription).
  Isolé la cause à une course entre `router.push()` et `router.refresh()` dans
  `app/(auth)/register/page.tsx` (voir Notes techniques) — corrigé en retirant le
  `router.refresh()` redondant. Corrigé aussi un locator du test billing
  (`CardTitle` rend un `<div>`, pas un heading — `getByRole("heading", ...)` ne le
  matchait jamais) et un strict-mode violation sur `$29.00` (présent 4 fois sur la
  page Stripe, `.first()`).
- 2026-07-17 (implement) — implémenté : `pnpm test:e2e` passe 3/3 (inscription +
  organisation ; souscription Pro → vraie redirection Stripe Checkout test mode
  avec vérification du montant sur la page Stripe ; upload de document → apparition
  dans le tableau). Base E2E isolée vérifiée (dev DB restée à 3 users après
  plusieurs runs E2E). Fichiers : `playwright.config.ts`, `e2e/global-setup.ts`,
  `e2e/helpers/auth.ts`, `e2e/signup.spec.ts`, `e2e/billing.spec.ts`,
  `e2e/documents.spec.ts`, `e2e/fixtures/test-image.png`,
  `app/(auth)/register/page.tsx`, `.env`, `.gitignore`, `eslint.config.mjs`,
  `package.json`. `tsc --noEmit`, `eslint .`, `pnpm test` et `next build` tous
  clean.
