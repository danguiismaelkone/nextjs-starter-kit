---
id: ITEM-068
title: Domaine personnalisé par organisation (White Label)
status: implemented
priority: P3
type: feature
estimate: M
depends_on: [ITEM-049]
created: 2026-07-16
updated: 2026-07-17
---

## Idée / contexte
Pour un client White Label, la marque d'origine ne doit jamais apparaître — y compris
dans l'URL. Cela va au-delà du simple branding visuel (ITEM-049).

## User story
En tant qu'admin d'une organisation White Label, je veux accéder à la plateforme via
mon propre nom de domaine, afin que mes utilisateurs ne voient jamais la marque
d'origine.

## Critères d'acceptation
- [x] Une organisation peut renseigner un domaine personnalisé dans ses paramètres,
      avec instructions de configuration DNS (CNAME) affichées.
- [x] Le middleware Next.js résout l'organisation active à partir du domaine de la
      requête plutôt que d'un sous-chemin.
- [x] Le certificat TLS du domaine personnalisé est provisionné automatiquement (ex.
      via Nginx + Let's Encrypt/Traefik).

## Notes techniques
**Schéma** — `Organization.customDomain String? @unique` (migration
`20260717070000_add_organization_custom_domain`, créée à la main : `prisma migrate
dev` refuse de tourner en environnement non interactif ici — `prisma migrate deploy`
appliqué ensuite, comme pour les migrations précédentes de cette session).

**Fichier `middleware.ts` → en réalité `proxy.ts`** : ce repo est en Next.js 16, qui a
renoncé à `middleware.ts` au profit de `proxy.ts` (`export function proxy`) —
`ITEM-055` (CSRF) avait déjà posé ce fichier avant cet item. Avoir les deux fichiers
en même temps fait planter `next build` (`Both middleware file "./middleware.ts" and
proxy file "./proxy.ts" are detected`, découvert en vérifiant réellement le build,
pas seulement en lisant le code) — la logique de résolution par domaine a donc été
fusionnée dans `proxy.ts` existant plutôt que dans un nouveau fichier. Le matcher est
élargi de `/api/:path*` à toutes les routes (nécessaire : la résolution par domaine
doit s'appliquer aux pages, pas seulement aux routes API) mais la portée du contrôle
CSRF existant reste, elle, explicitement inchangée (toujours restreinte à `/api/*` en
interne) — vérifié par requêtes réelles contre `next dev` : `POST /api/billing/cancel`
avec un `Origin` invalide renvoie toujours 403, `/api/webhooks/stripe` (exempté) n'est
pas affecté.

**Résolution par domaine** (`lib/domains.ts`, nouveau) : `proxy.ts` pose
`x-organization-domain` à partir du `Host` réel sur **toute** requête (toujours
écrasé — `Headers.set`, jamais `append` — donc pas usurpable par le client). Le
matching `Host` → `Organization` se fait dans `getCurrentOrganization()`
(`lib/organization.ts`), pas dans `proxy.ts` : le driver Postgres
(`@prisma/adapter-pg`) a besoin du runtime Node.js, pas du runtime Edge par défaut du
middleware Next.js. `platformHostname()` (dérivé de `BETTER_AUTH_URL`, même source que
le reste du repo pour ses URLs absolues) sert de court-circuit pour éviter une requête
Prisma supplémentaire sur le trafic normal — approximatif par nature (LB interne,
domaine de préprod...) mais ce n'est qu'une optimisation, pas la frontière de
sécurité : celle-ci reste la contrainte `@unique` sur `customDomain`. Domaine reconnu
mais utilisateur non membre → `null` **sans repli sur le cookie** (jamais exposer une
autre organisation de l'utilisateur via le domaine White Label d'un tiers). Domaine
non reconnu (accès normal à la plateforme) → repli sur la résolution par cookie
existante (ITEM-015), inchangée.

**UI** (`/settings/organizations/[id]/domain`, même schéma que branding/SSO —
ITEM-049/ITEM-065) : formulaire + instructions CNAME (cible = `platformHostname()`),
gardé owner/admin de l'organisation, `customDomainSchema` (`lib/validators/
organization.ts`) valide le format hostname, l'action rejette un domaine déjà pris
par une autre organisation ou identique au domaine de la plateforme elle-même. Lien
ajouté depuis `OrganizationForm.tsx`.

**TLS automatique** : le reverse-proxy `nginx` posé par ITEM-064 sert un seul domaine
avec un certificat monté à la main — insuffisant pour un nombre arbitraire de domaines
clients ajoutés à chaud depuis l'UI ci-dessus. Ajout de **Caddy** en alternative
(`caddy/Caddyfile`, service `caddy` sous un nouveau profil Compose `white-label`,
mutuellement exclusif avec `nginx` — les deux écoutent sur 80/443, voir
`caddy/README.md`) : `on_demand_tls` demande et renouvelle automatiquement un
certificat Let's Encrypt pour chaque hostname vu pour la première fois, à condition
que `GET /api/domains/verify?domain=<host>` (nouveau, `app/api/domains/verify/
route.ts`) réponde 200 — ne répond 200 que pour un domaine réellement configuré comme
`Organization.customDomain`, pour ne jamais transformer ce endpoint en oracle
permettant d'émettre des certificats pour des domaines arbitraires au nom de la
plateforme. `Caddyfile` validé avec `caddy validate`/`caddy fmt` (image `caddy:2.8-
alpine`) et `docker compose config` vérifiés réellement, pas seulement écrits — voir
Journal. Émettre un vrai certificat Let's Encrypt exige un domaine public dont le DNS
pointe réellement vers la machine qui exécute Caddy (challenge HTTP-01) : **non
vérifiable dans cet environnement** (pas de domaine public/DNS réel disponible) — le
mécanisme (config Caddy + endpoint de validation) est testé, l'émission réelle d'un
certificat ne l'est pas, à couvrir en déploiement réel.

Fichiers : `prisma/schema.prisma`, `prisma/migrations/
20260717070000_add_organization_custom_domain/`, `lib/domains.ts` (nouveau),
`lib/organization.ts`, `lib/organization.test.ts` (nouveau), `lib/validators/
organization.ts`, `proxy.ts`, `app/api/domains/verify/route.ts` (nouveau),
`app/(protected)/settings/organizations/[id]/domain/` (nouveau, `page.tsx` +
`actions.ts`), `components/tenant/CustomDomainForm.tsx` (nouveau),
`components/tenant/OrganizationForm.tsx`, `caddy/Caddyfile` (nouveau),
`caddy/README.md` (nouveau), `docker-compose.yml`.

Vérifications effectuées : `npx tsc --noEmit`, `npx eslint .`, `npx vitest run` (46
tests, dont 5 nouveaux sur `getCurrentOrganization`), `npx next build`, `docker
compose config` (profil `white-label`), `caddy validate`/`caddy fmt` sur le
`Caddyfile`. Testé en conditions réelles avec `next dev` : page servie normalement
avec un `Host` arbitraire (pas de régression), `GET /api/domains/verify` renvoie 404
pour un domaine non enregistré, `POST /api/billing/cancel` avec un `Origin` invalide
renvoie toujours 403 (CSRF ITEM-055 non régressé par l'élargissement du matcher de
`proxy.ts`).

## Captures attendues
Accès à l'application via un domaine personnalisé de test, affichant la bonne
organisation. Certificat TLS non vérifiable sans domaine public réel (voir Notes
techniques) — à couvrir en déploiement réel plutôt qu'en capture locale.

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-17 (implement) — démarrage
- 2026-07-17 (implement) — implémenté : `Organization.customDomain` (schéma +
  migration), résolution par domaine fusionnée dans `proxy.ts` (renommage Next.js 16
  de `middleware.ts`, bug de build réel découvert et corrigé — les deux fichiers ne
  peuvent pas coexister), `getCurrentOrganization()` résout par domaine avant repli
  cookie, UI `/settings/organizations/[id]/domain` (CNAME affiché), et TLS automatique
  via Caddy (`on_demand_tls` + `GET /api/domains/verify`, profil Compose
  `white-label` distinct de `nginx`/ITEM-064). Fichiers listés en Notes techniques.
