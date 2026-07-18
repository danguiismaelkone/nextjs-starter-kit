---
id: ITEM-059
title: Pipeline CI/CD
status: implemented
priority: P1
type: chore
estimate: S
depends_on: [ITEM-057]
created: 2026-07-16
updated: 2026-07-16
---

## Idée / contexte
Avec des tests en place (ITEM-057), il faut les exécuter automatiquement sur chaque
pull request pour empêcher la fusion de code cassé dans ce SaaS Core partagé par
plusieurs futurs produits.

## User story
En tant qu'équipe de développement, je veux que chaque pull request soit
automatiquement testée et lintée, afin d'éviter de fusionner du code cassé.

## Critères d'acceptation
- [x] Pipeline CI (GitHub Actions) exécute lint, typecheck, tests unitaires et build sur
      chaque PR.
- [ ] Le pipeline bloque la fusion si une étape échoue. **Non fait** : nécessite une
      règle de protection de branche sur `master` (changement des paramètres du repo
      GitHub, pas quelque chose que le fichier de workflow seul peut imposer) —
      délibérément laissé de côté, à la demande explicite de l'utilisateur (voir
      Journal). Commande prête dans `README.md` (« CI/CD (ITEM-059) ») pour
      l'appliquer quand souhaité.
- [x] Les secrets (Stripe, Resend, Firebase, S3) sont injectés via des variables CI
      sécurisées, jamais commités.

## Notes techniques
Fichiers : `.github/workflows/ci.yml`, `README.md` (section « CI/CD »).

Décisions à l'implémentation :
- **Base Postgres éphémère en service CI** (`postgres:16-alpine`, même image que
  `docker-compose.yml`) plutôt qu'une `DATABASE_URL` fictive : `prisma migrate
  deploy` s'exécute pour de vrai contre un schéma neuf à chaque run, cohérent avec
  ce qui a été fait pour `e2e/global-setup.ts` (ITEM-058) — détecte une migration
  cassée ou désynchronisée, pas seulement un `next build` qui tolérerait une
  `DATABASE_URL` injoignable (aucune requête réelle n'est exécutée au build, les
  routes qui touchent Prisma sont toutes dynamiques, jamais pré-rendues).
- **`BETTER_AUTH_SECRET` généré à la volée** (`openssl rand -base64 32`, écrit dans
  `$GITHUB_ENV`) plutôt que stocké comme secret du repo : n'a besoin d'être stable
  qu'au sein d'un même run (pas de session à faire persister entre exécutions CI),
  un secret de plus à gérer sans bénéfice.
- **Aucun secret Stripe/Resend/Firebase/S3/Anthropic n'est requis pour que le
  pipeline passe** — vérifié en local avec tous désarmés (`unset`) : les clients
  paresseux de l'app (`getStripeClient()`, `getResendClient()`, etc., pattern déjà
  en place avant cet item) dégradent proprement plutôt que de faire échouer le
  build, et lint/typecheck/tests (ITEM-057, tout mocké) ne font aucun appel réseau
  réel vers ces services. Tous néanmoins référencés via `${{ secrets.* }}` dans le
  workflow (critère 3) : le jour où le repo a de vrais secrets configurés, ils sont
  automatiquement injectés sans modifier le fichier.
- **Node 22** (LTS), **pnpm 10** (`pnpm/action-setup@v4`, `pnpm-lock.yaml` présent
  et figé via `--frozen-lockfile`) — pas de version explicitement pinnée dans
  `package.json` (`engines`/`packageManager` absents) avant cet item ; le choix est
  fait uniquement dans le workflow, sans toucher `package.json` (hors périmètre).
- **Portée volontairement limitée par l'utilisateur** : ni push d'une branche/PR de
  démonstration, ni configuration de la protection de branche `master` — les deux
  modifient un état partagé du repo GitHub (visible par tout collaborateur,
  respectivement une exécution Actions publique et une règle de fusion permanente)
  et ont été explicitement déclinés pour l'instant. Le fichier de workflow reste
  donc non commité (prêt à l'être) ; la commande `gh api` pour la protection de
  branche est documentée dans `README.md` plutôt qu'exécutée.
- Vérifié **en local**, séquence identique au workflow, contre une base Postgres
  fraîche jamais migrée auparavant (jamais réutilisée d'un item précédent) :
  `prisma generate` → `prisma migrate deploy` (30 migrations appliquées avec
  succès) → `pnpm lint` (0 erreur) → `tsc --noEmit` (0 erreur) → `pnpm test`
  (28/28) → `pnpm build` (production, toutes les routes) — sans aucun secret
  Stripe/Resend/Firebase/S3/Anthropic défini. Base de test supprimée après
  vérification. YAML validé syntaxiquement (`yaml.safe_load`).

## Captures attendues
N/A (statut CI vert visible sur une pull request de test). Non capturé à
l'implémentation (pas de push/PR, décision utilisateur — voir Notes techniques) :
`backlog-test`/l'utilisateur devra pousser une branche et ouvrir une PR pour obtenir
cette capture, une fois prêt.

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-17 (implement) — démarrage
- 2026-07-17 (implement) — demandé à l'utilisateur s'il fallait pousser une branche/
  ouvrir une PR de démonstration, et configurer la protection de branche `master` —
  les deux déclinés pour l'instant (« No, just commit locally » / « No, leave it
  unconfigured »). Documenté dans `README.md` la commande `gh api` prête à l'emploi
  pour la protection de branche, et la liste des secrets à ajouter au repo.
- 2026-07-17 (implement) — implémenté : `.github/workflows/ci.yml` (lint, typecheck,
  tests, build, base Postgres éphémère, secrets via `${{ secrets.* }}`), section
  README « CI/CD (ITEM-059) ». Fichiers : `.github/workflows/ci.yml`, `README.md`.
  Pipeline vérifié de bout en bout en local (séquence identique, base fraîche) —
  voir Notes techniques. Fichier de workflow non commité (à la demande de
  l'utilisateur) ; critère « bloque la fusion » non réalisé (nécessite une action
  manuelle de configuration du repo, documentée mais non appliquée).
