This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


## Modules installed

shadcn ui
prisma


### Prisma setup
https://ethanmick.com/how-to-set-up-prisma-with-next-js-postgres/

### Rôles et premier compte admin

Les utilisateurs ont un champ `role` (`user` par défaut, `admin`). Il n'y a pas
d'interface pour promouvoir un admin (poule/œuf) : après avoir créé un compte via
`/register`, promouvez-le avec :

```bash
node --env-file=.env scripts/promote-admin.mjs vous@example.com
```

### Sauvegardes et restauration (ITEM-056)

`scripts/backup-db.sh` effectue un `pg_dump` compressé de la base et l'envoie vers le
stockage S3-compatible déjà configuré pour l'app (`S3_ENDPOINT`/`S3_BUCKET`,
ITEM-027 — MinIO en local, S3/R2 en production), sous la clé
`backups/postgres/<horodatage>.sql.gz`, puis purge les sauvegardes plus vieilles que
`BACKUP_RETENTION_DAYS` (défaut **30 jours glissants**).

Prérequis (sur la machine/l'image qui exécute le script — pas une dépendance Node du
projet) : `pg_dump` et `aws` (AWS CLI v2) sur le `PATH`.

**Planification** (exemple cron, une fois par jour à 3h) :

```
0 3 * * * cd /app && ./scripts/backup-db.sh >> /var/log/backup-db.log 2>&1
```

**Restauration** — `scripts/restore-db.sh`, contrepartie de `backup-db.sh`. Écrase le
contenu de la base ciblée par `DATABASE_URL` : action manuelle et explicite
uniquement (confirmation interactive requise), jamais planifiée.

```bash
# Restaure la sauvegarde la plus récente
./scripts/restore-db.sh --latest

# Restaure une sauvegarde précise
./scripts/restore-db.sh backups/postgres/20260716T030000Z.sql.gz
```

Procédure testée de bout en bout en développement (`backup-db.sh` contre la base
locale → objet présent dans MinIO → `restore-db.sh` vers une base de test dédiée →
comptages de lignes identiques à la source sur les tables clés) — voir le Journal
d'ITEM-056 pour le détail. Le dump inclut le schéma complet (tables, index,
contraintes) et les données ; il ne restaure pas les fichiers du stockage S3
(documents/avatars), qui suivent leur propre cycle de vie (ITEM-027).

Note de compatibilité : `pg_dump` récent (≥ 18) peut émettre des méta-commandes
`\restrict`/`\unrestrict` dans le dump, que seul un `psql` de version équivalente sait
interpréter — utilisez des versions de `pg_dump`/`psql` cohérentes entre la machine de
sauvegarde et celle de restauration.

### CI/CD (ITEM-059)

`.github/workflows/ci.yml` exécute, sur chaque pull request vers `master` (et chaque
push sur `master`) : `prisma generate` + `prisma migrate deploy` (contre un Postgres
éphémère fourni par le job, service `postgres:16-alpine`), `pnpm lint`, `pnpm exec tsc
--noEmit`, `pnpm test` (suite Vitest, ITEM-057) et `pnpm build` (production).

**Secrets requis** — à ajouter dans *Settings → Secrets and variables → Actions* du
repo GitHub (jamais commis, injectés via `${{ secrets.* }}` dans le workflow) :
`RESEND_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`,
`STRIPE_WEBHOOK_SECRET`, `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`,
`S3_SECRET_ACCESS_KEY`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`,
`FIREBASE_PRIVATE_KEY`, `ANTHROPIC_API_KEY`. Aucun n'est strictement requis pour que
le pipeline passe : les clients paresseux de l'app (`getStripeClient()`,
`getResendClient()`, etc.) dégradent proprement en leur absence, et lint/typecheck/
tests/build ne font aucun appel réseau réel vers ces services — vérifié en local sans
aucun de ces secrets définis. `DATABASE_URL` et `BETTER_AUTH_SECRET` sont fournis
automatiquement par le workflow (base éphémère du job, secret généré à la volée),
pas besoin de les ajouter comme secrets du repo.

**Bloquer la fusion sur échec CI (critère d'acceptation)** — nécessite une règle de
protection de branche sur `master`, une configuration des paramètres du repo (pas
quelque chose que le fichier de workflow seul peut imposer) : *Settings → Branches →
Add branch protection rule* sur `master` → cocher *Require status checks to pass
before merging* → sélectionner le check `Lint, typecheck, tests, build`. Équivalent
en CLI :

```bash
gh api repos/<owner>/<repo>/branches/master/protection \
  -X PUT \
  -f required_status_checks[strict]=true \
  -f 'required_status_checks[contexts][]=Lint, typecheck, tests, build' \
  -F enforce_admins=false \
  -F required_pull_request_reviews=null \
  -F restrictions=null
```

Pipeline vérifié de bout en bout **en local** (mêmes commandes, même séquence, base
Postgres fraîche jamais migrée auparavant) — voir le Journal d'ITEM-059. Non encore
vérifié sur une exécution GitHub Actions réelle (nécessite de pousser une branche et
d'ouvrir une PR) ni la protection de branche (changement de paramètres du repo) :
les deux ont été délibérément laissés de côté à l'implémentation, à la demande de
l'utilisateur — actions à faire manuellement, ou par `backlog-test`/`backlog-verify`.
