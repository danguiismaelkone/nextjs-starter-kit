# syntax=docker/dockerfile:1

# Image de production multi-étapes (ITEM-064) : chaque étape ne garde que ce
# qui lui est utile — l'image finale ("runner") ne contient ni pnpm, ni les
# sources TypeScript, ni les devDependencies (Tailwind, Vitest, Playwright...).

ARG NODE_VERSION=22-alpine

# --- Étape 1 : dépendances ---------------------------------------------------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
# `openssl` : requis par Prisma pour la génération du client, même en mode
# adaptateur (`@prisma/adapter-pg`, ITEM-027) qui n'a pas besoin du moteur de
# requêtes natif — seule la CLI `prisma generate` s'appuie encore dessus.
RUN apk add --no-cache openssl libc6-compat
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# --- Étape 2 : build ----------------------------------------------------------
FROM node:${NODE_VERSION} AS builder
WORKDIR /app
RUN apk add --no-cache openssl
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Généré explicitement (pas seulement via le postinstall de `prisma`, que pnpm
# peut ignorer par défaut pour les paquets non approuvés) — déterministe.
RUN pnpm exec prisma generate
ENV NEXT_TELEMETRY_DISABLED=1
# Placeholders de build (ARG, jamais persistés dans l'image ni dans les
# métadonnées des couches au-delà de cette étape — contrairement à ENV) :
# `next build` évalue les modules serveur (dont `lib/prisma.ts`) sans exécuter
# de requête réelle, une valeur syntaxiquement valide suffit. Les vraies
# variables sont injectées au démarrage du conteneur (docker-compose.yml).
ARG DATABASE_URL="postgresql://user:password@localhost:5432/db"
ARG BETTER_AUTH_SECRET="build-time-placeholder-not-used-at-runtime"
ARG BETTER_AUTH_URL="http://localhost:3000"
RUN pnpm build

# --- Étape 3 : exécution -------------------------------------------------------
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Utilisateur non-root (bonne pratique standard des images Next.js officielles).
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
# Sortie "standalone" (next.config.ts) : serveur Node autonome avec uniquement
# les fichiers/dépendances réellement importés — pas tout `node_modules`, donc
# pas la CLI Prisma (jamais importée par le code applicatif, seulement par des
# scripts ponctuels) : les migrations tournent depuis le service `migrate` de
# docker-compose.yml (image `builder`, qui a la CLI complète), pas ici — plus
# sûr en production (pas de migration concurrente si l'app scale à plusieurs
# réplicas) et évite de fragiliser cette étape avec les liens symboliques du
# `node_modules` pnpm.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
