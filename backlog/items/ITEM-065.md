---
id: ITEM-065
title: SSO / SAML (Enterprise)
status: implemented
priority: P3
type: feature
estimate: L
depends_on: [ITEM-013]
created: 2026-07-16
updated: 2026-07-17
---

## Idée / contexte
Les clients Enterprise imposent souvent leur propre fournisseur d'identité plutôt que
des comptes email/mot de passe classiques. C'est un standard attendu à ce niveau de
gamme.

## User story
En tant qu'admin d'une organisation Enterprise, je veux connecter mon fournisseur
d'identité (SAML/OIDC), afin que mes employés se connectent avec leurs identifiants
d'entreprise.

## Critères d'acceptation
- [x] Une organisation peut configurer un fournisseur SSO (métadonnées SAML ou client
      OIDC) dans ses paramètres.
- [x] La connexion via SSO crée/rattache automatiquement l'utilisateur à l'organisation
      avec le rôle par défaut configuré.
- [x] La connexion par mot de passe reste disponible en secours sauf si l'organisation
      l'a explicitement désactivée.

## Notes techniques
Plugin officiel `@better-auth/sso` (peer-matched `1.6.23`) retenu plutôt qu'une
implémentation custom, conformément à la piste indiquée ci-dessus.

**Modèle multi-tenant custom vs plugin `organization` de Better Auth** — ce repo a ses
propres `Organization`/`Membership` (ITEM-017), pas le plugin `organization` officiel de
Better Auth. Deux conséquences découvertes à l'exécution (pas visibles à la seule
lecture du code) :
- `organizationProvisioning` du plugin SSO est un no-op sans le plugin `organization`
  (vérifié dans son source compilé). Rattachement à l'organisation implémenté à la main
  via `provisionUser` dans `lib/auth.ts`, qui upsert un `Membership` avec le
  `ssoDefaultRole` de l'organisation.
- **Bug bloquant constaté à l'exécution** : passer `organizationId` au body de
  `auth.api.registerSSOProvider` fait planter l'appel (`BetterAuthError: Model "member"
  not found in schema`) — le plugin interroge son propre modèle `member` (celui du
  plugin `organization`) dès que ce champ est fourni, sans jamais vérifier
  `hasPlugin("organization")` avant cette requête précise (contrairement à
  `checkProviderAccess`, qui lui fait bien ce garde-fou). Contournement : `organizationId`
  omis du body d'enregistrement, puis rattaché après coup via
  `prisma.ssoProvider.update()` — l'autorisation ayant déjà été vérifiée par
  `requireOrgAdminSession`.
- **Second bug de même origine** : une fois `organizationId` posé sur un provider,
  `auth.api.deleteSSOProvider` retombe sur `provider.userId === userId` (toujours sans
  plugin `organization` actif) — seul l'admin ayant enregistré le fournisseur pourrait le
  supprimer, pas les autres owners/admins de l'organisation. Contournement : suppression
  faite directement via une transaction Prisma (purge des `Account` liés au
  `providerId` + suppression du `SsoProvider`), après la même vérification
  `requireOrgAdminSession`.
- Ces deux contournements ont été identifiés via test fonctionnel réel contre une base
  Postgres isolée (conteneur Docker jetable, port 5433), pas par simple lecture — sans
  cela, l'enregistrement d'un fournisseur SSO aurait échoué à 100% en production.

**Découverte automatique OIDC bloquée par la protection anti-SSRF du plugin** — constaté
en testant avec un émetteur réel public (`https://accounts.google.com`) : la découverte
automatique (`<issuer>/.well-known/openid-configuration`) exige que l'émetteur ET
chacun des endpoints qu'il référence (`token_endpoint`, `jwks_uri`...) soient listés dans
`trustedOrigins` de Better Auth — y compris quand ces endpoints sont sur des
sous-domaines différents d'un fournisseur légitime (le `token_endpoint` de Google est sur
`oauth2.googleapis.com`, différent de l'`issuer` `accounts.google.com`). En libre-service
pour un client Enterprise arbitraire, la découverte automatique ne peut donc jamais
fonctionner sans intervention de l'opérateur de la plateforme (ajout manuel à
`BETTER_AUTH_TRUSTED_ORIGINS`). Le mode `skipDiscovery` du plugin (endpoints saisis
individuellement par l'admin, chacun validé comme publiquement routable — sans
`trustedOrigins`) contourne cette limite : ajouté au formulaire OIDC
(`components/tenant/SsoSettingsForm.tsx`, case à cocher « Saisir les URLs
manuellement ») comme mode recommandé. Testé de bout en bout avec Google comme émetteur
réel : enregistrement réussi, puis `/sign-in/sso` génère une URL d'autorisation PKCE
valide pointant vers le vrai `authorizationEndpoint` de Google.

**Sécurité** — `auth.api.registerSSOProvider`/`deleteSSOProvider` n'exigent nativement
qu'une session valide (n'importe quel utilisateur connecté), pas un rôle owner/admin de
l'organisation ciblée par `organizationId`. Fermé côté app par
`requireOrgAdminSession()` dans chaque Server Action
(`app/(protected)/settings/organizations/[id]/sso/actions.ts`), appelé avant tout appel
au plugin.

**Verrouillage** — `updateSsoSettingsAction` refuse d'activer `ssoEnforced` tant
qu'aucun fournisseur SSO n'est configuré pour l'organisation (éviterait sinon de
verrouiller l'organisation hors de tout moyen de connexion).

**Schéma Prisma** — `@better-auth/cli generate` abandonné (plante avec `Cannot find
module '.prisma/client/default'`, le CLI embarquant un `@prisma/client@5.22.0`
incompatible). Modèle `SsoProvider` écrit à la main d'après le schéma déclaré dans le
source compilé du plugin (`@better-auth/sso/dist/index.mjs`).

**UI** — `Switch` de `ssoEnforced` en pattern contrôlé (`useState` + `onCheckedChange` +
input caché `"true"`/`"false"`) plutôt que la participation native au FormData
(`name`+`defaultChecked`), non éprouvée ailleurs dans ce repo. Lien vers la page SSO
ajouté sur `/settings/organizations/[id]` (à côté du lien Branding existant). Page de
connexion (`/login`) étendue avec une entrée SSO par e-mail professionnel, appelant
`authClient.signIn.sso({ email, callbackURL })` — la redirection vers le fournisseur est
automatique (`redirectPlugin` interne à better-auth, déclenché par `{ url, redirect:
true }`).

Fichiers : `prisma/schema.prisma`, `lib/auth.ts`, `lib/auth-client.ts`,
`lib/validators/sso.ts`, `app/(protected)/settings/organizations/[id]/sso/{page.tsx,
actions.ts}`, `components/tenant/{SsoSettingsForm.tsx,OrganizationForm.tsx}`,
`app/(auth)/login/LoginForm.tsx`.

**Limite de vérification** — aucun IdP SAML/OIDC réel n'était disponible dans cet
environnement pour compléter une connexion SSO de bout en bout (même contrainte que
l'absence de compte Sentry réel en ITEM-062). Ce qui a été vérifié fonctionnellement,
contre une vraie base Postgres (conteneur jetable, migrations réellement appliquées) et
un vrai serveur Next.js démarré :
- Inscription, création d'organisation, enregistrement d'un fournisseur OIDC (avec
  émetteur réel public Google, mode `skipDiscovery`) et d'un fournisseur SAML — tous
  deux via les vrais endpoints du plugin.
- `/sign-in/sso` par domaine e-mail génère une vraie URL d'autorisation OIDC (PKCE,
  state, redirect_uri) pointant vers le vrai `authorizationEndpoint` de Google, et un
  vrai `SAMLRequest` (deflate + base64) pointant vers l'`entryPoint` SAML configuré.
- Endpoint de métadonnées SP (`/api/auth/sso/saml2/sp/metadata`) renvoie un XML valide
  avec la bonne URL ACS.
- Verrou `ssoEnforced` : connexion par mot de passe bloquée (403, `SSO_REQUIRED`) pour un
  membre d'une organisation avec `ssoEnforced: true`, puis à nouveau autorisée après
  désactivation — et jamais impactée pour un utilisateur hors de toute organisation
  SSO-enforced (non-régression vérifiée).
- Suppression d'un fournisseur (transaction Prisma) vérifiée directement.
- Pages `/settings/organizations/[id]/sso`, `/settings/organizations/[id]` (lien SSO) et
  `/login` (bouton SSO) rendues via de vraies requêtes HTTP avec session authentifiée.
- Non vérifié (nécessiterait un IdP réel) : callback OIDC/SAML complet (échange du code
  contre un jeton / validation de l'assertion SAML signée) et déclenchement effectif de
  `provisionUser` en conditions réelles — la logique de `provisionUser` elle-même a été
  relue mais pas exécutée via un vrai callback.

## Captures attendues
Connexion réussie via un fournisseur SSO de test, utilisateur rattaché à la bonne
organisation. *(Non capturable dans cet environnement — aucun IdP réel disponible ; voir
limite de vérification ci-dessus.)*

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-17 (implement) — démarrage
- 2026-07-17 (implement) — implémenté : plugin `@better-auth/sso`, modèle `SsoProvider`,
  provisioning custom, page/actions/formulaire de gestion SSO, verrou mot de passe,
  entrée SSO sur la page de connexion. Deux bugs bloquants du plugin découverts et
  contournés via test fonctionnel réel (crash sur `organizationId` à l'enregistrement,
  contrôle d'accès trop strict à la suppression) ; mode `skipDiscovery` ajouté après avoir
  constaté que la découverte OIDC automatique échoue systématiquement en libre-service.
  Fichiers : `prisma/schema.prisma`, `lib/auth.ts`, `lib/auth-client.ts`,
  `lib/validators/sso.ts`, `app/(protected)/settings/organizations/[id]/sso/actions.ts`,
  `app/(protected)/settings/organizations/[id]/sso/page.tsx`,
  `components/tenant/SsoSettingsForm.tsx`, `components/tenant/OrganizationForm.tsx`,
  `app/(auth)/login/LoginForm.tsx`, `package.json`.
