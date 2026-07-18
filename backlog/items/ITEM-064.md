---
id: ITEM-064
title: Dockerisation complète (Dockerfile, docker-compose, Nginx)
status: implemented
priority: P1
type: chore
estimate: M
depends_on: []
created: 2026-07-16
updated: 2026-07-16
---

## Idée / contexte
`docker-compose.yml` existe déjà à la racine (probablement limité à PostgreSQL pour
l'instant). Pour que ce SaaS Core soit réellement réutilisable comme base de
déploiement, il faut une stack Docker complète (app + DB + stockage + reverse proxy).

## User story
En tant qu'équipe de développement, je veux pouvoir lancer toute la stack en une
commande, afin de garantir un environnement reproductible en local et en production.

## Critères d'acceptation
- [x] `Dockerfile` multi-stage pour l'application Next.js (build optimisé, image de
      production légère).
- [x] `docker-compose.yml` étendu pour orchestrer l'app, PostgreSQL et MinIO (ITEM-027)
      pour le développement local.
- [x] Configuration Nginx en reverse proxy (TLS, headers de sécurité de base) pour un
      déploiement de production.

## Notes techniques
Fichiers : `Dockerfile`, `.dockerignore`, `docker-compose.yml` (étendu, services
`postgres`/`minio` originaux inchangés), `nginx/nginx.conf`, `nginx/README.md`,
`nginx/certs/.gitkeep`, `next.config.ts` (`output: "standalone"`), `package.json`
(`packageManager`, voir ci-dessous).

Décisions à l'implémentation :
- **`Dockerfile` en 3 étapes** (`deps` → `builder` → `runner`) : l'image finale
  ne copie que la sortie Next.js `standalone` (`next.config.ts`, trace
  uniquement les fichiers/dépendances réellement importés à l'exécution) —
  339 Mo au lieu d'un `node_modules` complet copié tel quel. Ce projet utilise
  déjà `@prisma/adapter-pg` (ITEM-027) : confirmé qu'aucun moteur de requêtes
  Prisma natif (binaire Rust) n'est présent dans `node_modules`, donc aucun
  souci de `binaryTargets`/musl typique de Prisma en Alpine à gérer ici — un
  vrai bénéfice du mode adaptateur pour Docker.
- **CLI Prisma volontairement absente de l'image finale** : la sortie
  `standalone` ne trace que ce qu'importe le code applicatif, jamais un outil
  CLI comme `prisma migrate deploy` — tenter de copier `node_modules/prisma`
  à la main se serait heurté aux liens symboliques de la structure
  `node_modules` de pnpm (fragile). Les migrations tournent depuis un service
  `migrate` dédié (`docker-compose.yml`), basé sur l'étape `builder` (qui a la
  CLI complète) et non redémarré (`command` ponctuel) — plus sûr en
  production (pas de migration concurrente si `app` scale à plusieurs
  réplicas) que migrer au démarrage de chaque instance applicative.
- **`packageManager: "pnpm@10.30.0"` ajouté à `package.json`** (absent avant
  cet item) — nécessaire, pas cosmétique : sans version épinglée, `corepack
  enable` dans l'image `node:22-alpine` télécharge le pnpm "latest" du
  moment, qui applique une politique `minimumReleaseAge` rejetant les
  paquets publiés trop récemment — a fait échouer `pnpm install
  --frozen-lockfile` sur `@sentry/*` (ajoutés cette session, ITEM-062).
  Épingler la version utilisée en local résout ce à la source plutôt que de
  contourner la policy.
- **Placeholders `ARG` (pas `ENV`) pour les variables de build** —
  `DATABASE_URL`/`BETTER_AUTH_SECRET`/`BETTER_AUTH_URL` : `next build` évalue
  les modules serveur (dont `lib/prisma.ts`) sans exécuter de requête réelle,
  une valeur syntaxiquement valide suffit à l'étape `builder` ; `ARG` (contrairement
  à `ENV`) ne persiste pas dans les métadonnées de couches au-delà de l'étape
  qui le déclare. Buildkit signale un avertissement `SecretsUsedInArgOrEnv`
  sur `BETTER_AUTH_SECRET`/`BETTER_AUTH_URL` (faux positif — heuristique sur
  le nom de variable, pas sur le contenu réel, qui est un texte factice
  documenté en commentaire) : accepté tel quel, renommer casserait le nom de
  variable réel que Better Auth lit.
- **`.dockerignore`** — exclut aussi `playwright.config.ts`/`vitest.config.ts`
  (pas seulement `e2e`/`coverage`/tests) : `next build` type-check tout
  `**/*.ts` du repo (`tsconfig.json`), et `playwright.config.ts` importe
  `./e2e/global-setup` — sans cette exclusion supplémentaire, la référence
  devient cassée une fois `e2e/` absent du contexte de build (bug réel
  rencontré et corrigé pendant la vérification, voir Journal).
- **`docker-compose.yml` étendu, jamais remplacé** — `postgres`/`minio`
  strictement inchangés (juste un `healthcheck` ajouté, nécessaire pour que
  `migrate`/`app` attendent qu'ils soient réellement prêts via `depends_on:
  condition: service_healthy`). `app` fait partie des services par défaut
  (`docker compose up` lance toute la stack, conforme à la user story) ;
  `nginx` est réservé au profil `production` (`docker compose --profile
  production up`) — non pertinent en développement local où l'app est déjà
  accédée directement.
- **`nginx.conf`** : termine le TLS et pose HSTS (n'a de sens qu'après
  terminaison TLS, donc ici et pas dans `next.config.ts`) ; ne duplique pas
  CSP/X-Frame-Options/X-Content-Type-Options/Referrer-Policy déjà posés par
  Next.js lui-même (ITEM-055) — une seule source de vérité pour ces
  en-têtes-là, confirmée transmise intacte à travers le proxy pendant la
  vérification. Certificats montés en volume (`nginx/certs/`, jamais commis —
  `*.pem` déjà dans `.gitignore`), procédure documentée dans
  `nginx/README.md` (Let's Encrypt en prod, `openssl` auto-signé pour tester
  en local).
- Vérifié **en conditions réelles**, pas seulement en lecture de code :
  `docker build` complet de l'image (339 Mo), puis `docker compose up`
  orchestrant réellement les 4 services (`postgres`/`minio` sains via
  healthcheck → `migrate` s'exécute et se termine → `app` démarre seulement
  après) dans un projet Compose isolé (`-p item064verify`, ports remappés
  pour ne pas entrer en conflit avec le Postgres natif déjà utilisé tout au
  long de cette session) — `/`, `/register`, `/login` répondent 200,
  `/api/health` confirme une vraie connectivité DB **et** stockage via le
  réseau Docker interne (bucket MinIO créé à la volée pour ce test). Profil
  `production` avec `nginx` testé avec un certificat auto-signé généré à la
  volée : redirection HTTP→HTTPS confirmée, TLS terminé, HSTS présent,
  en-têtes applicatifs (CSP) transmis intacts à travers le proxy,
  `/api/health` accessible via HTTPS. Deux bugs réels découverts et corrigés
  pendant cette vérification (`packageManager` manquant, `.dockerignore`
  incomplet — voir ci-dessus) — n'auraient pas été détectés sans construire
  et lancer l'image pour de vrai. Tout nettoyé après coup (conteneurs,
  volumes, réseau, images de test, certificats de test).

## Captures attendues
N/A (opérationnel — vérifiable via `docker compose up` démarrant l'ensemble de la
stack). Vérifié en dev (voir Journal) : stack complète démarrée avec succès, `/api/
health` (200, DB+stockage réels), reverse proxy `nginx` en profil `production` (HTTPS,
HSTS, redirection HTTP→HTTPS) — tout testé pour de vrai puis nettoyé.

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-17 (implement) — démarrage
- 2026-07-17 (implement) — implémenté : `Dockerfile` multi-étapes (`deps`/
  `builder`/`runner`, sortie `standalone`), `.dockerignore`, `docker-compose.yml`
  étendu (`healthcheck` sur `postgres`/`minio` existants, nouveaux services
  `migrate`/`app`/`nginx` — ce dernier sous profil `production`),
  `nginx/nginx.conf` + `nginx/README.md` (TLS, HSTS, reverse proxy),
  `next.config.ts` (`output: "standalone"`). Deux bugs réels trouvés et
  corrigés en testant l'image pour de vrai : `packageManager` manquant dans
  `package.json` (corepack téléchargeait un pnpm trop récent, policy
  `minimumReleaseAge` rejetant `@sentry/*`) et `.dockerignore` incomplet
  (`playwright.config.ts` non exclu, référence cassée vers `./e2e/global-setup`
  exclu lui). Fichiers listés en Notes techniques. Vérifié en conditions
  réelles : `docker build` (image 339 Mo), `docker compose up` orchestrant les
  4 services avec la bonne séquence de dépendances (migrate avant app),
  `/api/health` confirmant une vraie connectivité DB+MinIO via le réseau
  Docker, profil `production`+`nginx` testé avec un certificat auto-signé
  (HTTPS, HSTS, redirection HTTP→HTTPS, en-têtes CSP applicatifs transmis
  intacts). Tout nettoyé après coup. `tsc --noEmit`, `eslint .`, `pnpm test`
  (37/37) et `next build` (local, hors Docker) tous clean.
