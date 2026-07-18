---
id: ITEM-094
title: "Migration facturation : rattacher Subscription/Invoice/stripeCustomerId à l'utilisateur owner plutôt qu'à l'Organization"
status: implemented
priority: P1
type: chore
estimate: L
depends_on: [ITEM-013, ITEM-020]
created: 2026-07-18
updated: 2026-07-18
---

## Idée / contexte
Décision architecturale : le payeur devient **l'utilisateur owner**, plus
l'organisation. Aujourd'hui (ITEM-020) : `Subscription.organizationId` est
`@unique` (1 org = 1 abonnement) et `Organization.stripeCustomerId` porte le
client Stripe. Un même utilisateur qui posséderait plusieurs organisations
(ITEM-093) paierait donc plusieurs factures distinctes, une par organisation
— ce qui a motivé la question de l'utilisateur (« pourquoi ne pas gérer les
plans par owner ? ») et sa décision de migrer plutôt que de contourner
(`max(plan des orgs déjà possédées)` dans la version initiale d'ITEM-093).

**Nouveau modèle cible** : un utilisateur owner a **au plus un abonnement**
(un seul client Stripe, une seule facture par échéance), qui couvre **toutes
les organisations dont il est `owner`**. `Plan.maxUsers` reste un plafond
**par organisation** (ex. Enterprise = 10 users/org, inchangé) ;
`Plan.maxOrgsPerOwner` (ITEM-093) devient une simple lecture du plan de
l'abonnement de l'owner, sans plus avoir à dériver un maximum entre
plusieurs organisations déjà possédées.

Cet item est le **socle** (schéma + migration de données) ; ITEM-095
(Checkout/Portail/Webhooks) et ITEM-096 (pages `/billing*` + permissions) en
dépendent et ne peuvent pas être vérifiés indépendamment de lui.

## User story
En tant qu'utilisateur owner de plusieurs organisations (ITEM-093), je paie
**une seule facture** qui couvre l'ensemble de mes organisations, plutôt
qu'une facture par organisation.

## Critères d'acceptation
- [x] `Subscription.organizationId` (unique) remplacé par `Subscription.ownerId`
      (`String`, unique, `references: User.id`) — un `User` a au plus une
      `Subscription`.
- [x] `Organization.stripeCustomerId` retiré ; `User.stripeCustomerId`
      (`String?`, unique) ajouté.
- [x] `Invoice` reste rattaché à `Subscription` (inchangé, `subscriptionId`) —
      donc indirectement à l'owner, pas à une organisation particulière (une
      facture couvre potentiellement plusieurs organisations).
- [x] Migration des données existantes : pour chaque `Organization` ayant une
      `Subscription`/`stripeCustomerId`, les rattacher au `User` qui a le rôle
      `owner` sur cette organisation (cas 1:1 garanti en pratique aujourd'hui,
      voir note ci-dessous) — aucune perte de données de facturation en prod.
- [x] `lib/billing.ts` : `hasActiveEntitlement(organizationId)`,
      `isEnterpriseOrganization(organizationId)`,
      `isWhiteLabelOrganization(organizationId)`,
      `startTrialSubscription(ownerId)` adaptés — résolvent désormais
      l'owner de l'organisation (`Membership` role `owner`) puis sa
      `Subscription`, au lieu de `Subscription.organizationId`.
      `startTrialSubscription` prend directement `ownerId` (pas
      `organizationId`) : son unique appelant, `createOrganizationWithOwner`,
      connaît déjà le `userId` sans requête supplémentaire.
- [x] `pnpm exec tsc --noEmit` et `pnpm exec eslint .` passent sur tout le
      dépôt après migration (tous les call sites de
      `organization.stripeCustomerId` / `subscription.organizationId` mis à
      jour — voir note de périmètre ci-dessous, ce critère a fini par couvrir
      une bonne partie d'ITEM-095/096 par nécessité de compilation).

## Notes techniques
**Sûreté de la migration de données** : à ce jour, aucune organisation ne
peut avoir plus d'un `owner` actif ni un utilisateur être owner de plusieurs
organisations (ITEM-093 n'est pas encore livré, aucun flux de création de
2ᵉ organisation n'existe) — la migration `Organization → owner User` est donc
une correspondance 1:1 garantie sur les données actuelles. Écrire la
migration Prisma comme migration **de données** (pas juste de schéma) : copier
`stripeCustomerId`/`stripeSubscriptionId`/`planId`/etc. de l'organisation vers
son owner avant de supprimer les anciennes colonnes. Documenter dans la
migration que cette hypothèse (1 owner ↔ 1 org à ce stade) doit être
revérifiée si ITEM-093 était livré avant cet item (ce qui n'est pas
l'ordre prévu — voir dépendances de ITEM-093 mises à jour).
- `prisma/schema.prisma` : modèles `Subscription`, `Organization`, `User`.
- `prisma/seed.ts` : adapter `createOrganizationWithOwner`/le seed pour créer
  la `Subscription` sur l'owner plutôt que sur l'organisation.
**Débordement de périmètre assumé** : le critère « `tsc`/`eslint` passent »
imposait de facto de mettre à jour tous les fichiers qui référençaient
`organization.stripeCustomerId` ou `subscription.organizationId` — impossible
de laisser le dépôt dans un état qui ne compile pas entre deux items. Ont
donc été adaptés ici (mécaniquement : nouvelle clé de résolution, sans
ajouter de nouvelle UI/permission au-delà du strict nécessaire à la
compilation et à la cohérence fonctionnelle) :
- `app/api/billing/checkout/route.ts` : client Stripe créé/résolu sur
  `owner.stripeCustomerId` (`session.user.id` → owner de l'org active via
  `getOrganizationOwnerId`), `metadata: { ownerId, planId }` au lieu de
  `{ organizationId, planId }`. Permission inchangée (`admin:access`, pas
  restreint à l'owner — un admin peut initier une souscription pour le
  compte de l'owner réel de son organisation).
- `app/api/billing/portal/route.ts`, `app/api/billing/cancel/route.ts`,
  `app/api/billing/change-plan/route.ts` : résolvent `ownerId` via
  `getOrganizationOwnerId` et **restreignent l'action à
  `session.user.id === ownerId`** (403 sinon) — anticipé sur ITEM-095 car
  laisser un admin non-owner gérer le moyen de paiement/résilier/changer le
  plan d'un autre utilisateur aurait été une régression de sécurité, pas
  seulement un défaut de compilation.
- `app/api/webhooks/stripe/route.ts` : `session.metadata.ownerId` (au lieu de
  `organizationId`) pour `checkout.session.completed`.
- `app/(protected)/billing/plans/page.tsx`, `app/(protected)/billing/page.tsx`,
  `app/(protected)/billing/invoices/{page,actions}.ts` : résolvent l'owner de
  l'organisation active puis son `Subscription`/`Invoice[]` — **pas encore**
  de restriction d'affichage owner-only ni de liste des organisations
  couvertes (ça, c'est le cœur d'ITEM-096, resté hors périmètre ici).
- `app/onboarding/page.tsx` : utilise directement `session.user.id` comme
  `ownerId` (l'utilisateur qui atteint cette page avec une organisation déjà
  créée en est toujours l'owner — pas de requête supplémentaire).
- `app/(protected)/superadmin/page.tsx` : résout l'owner de chaque
  organisation listée (`Membership` role `owner`) puis son `Subscription` en
  un second aller-retour Prisma (`findMany` avec `ownerId: { in: [...] }`)
  plutôt qu'un `include` direct (devenu impossible, la relation n'existe
  plus sur `Organization`).
- `lib/rate-limit.ts` : `resolveLimit` résout l'owner avant de lire son plan.
- `lib/billing.test.ts` : entièrement mis à jour (mocks `membership`/`user`
  au lieu de `organization`, assertions sur `ownerId`).

Conséquence pour la suite : **ITEM-095 est déjà largement couvert** par ce
qui précède (Checkout/Portail/Webhooks adaptés et fonctionnels) — son
implémentation devrait se limiter à une revue/vérification plutôt que du
code nouveau. **ITEM-096 reste entièrement à faire** : affichage owner-only
vs. lecture seule sur `/billing*` (actuellement, les pages affichent
toujours les mêmes informations à tout admin, sans distinguer owner/non-owner
— seules les routes de *mutation* sont déjà restreintes), et liste des
organisations couvertes par un abonnement partagé (pertinent seulement une
fois ITEM-093 livré).

## Captures attendues
Aucune (item de migration de données, pas de surface UI directement
observable — vérifié par ITEM-096).

## Journal
- 2026-07-18 (implement) — démarrage. Vérification des données existantes
  avant migration : 2 organisations, 2 abonnements, 1 organisation avec
  `stripeCustomerId`, 2 owners distincts, **aucun owner ne possède plus d'une
  organisation** — confirme que la correspondance organisation → owner est
  sûre à 1:1 sur les données actuelles.
- 2026-07-18 (implement) — implémenté : migration Prisma manuscrite (données
  préservées, pas juste schéma) appliquée et vérifiée (`Subscription.ownerId`,
  `User.stripeCustomerId` correctement peuplés depuis les données
  existantes) ; `lib/billing.ts` adapté (`getOrganizationOwnerId` nouveau,
  `startTrialSubscription`/`hasActiveEntitlement`/`isEnterpriseOrganization`/
  `isWhiteLabelOrganization`/`upsertSubscriptionFromStripe`/
  `syncSubscriptionFromStripeSubscription`/`recordInvoiceFromStripe`/
  `syncSubscriptionFromCheckoutSession` résolvent désormais l'owner) ; tous
  les call sites du dépôt mis à jour pour rester compilables (voir Notes
  techniques pour le détail, dépassement de périmètre assumé vers ITEM-095).
  `pnpm exec tsc --noEmit`, `pnpm exec eslint .` et `pnpm exec vitest run`
  (70 tests, 9 fichiers) passent tous. Fichiers : `prisma/schema.prisma`,
  `prisma/migrations/20260718150000_migrate_subscription_to_owner/`,
  `lib/billing.ts`, `lib/billing.test.ts`, `lib/organization.ts`,
  `lib/rate-limit.ts`, `app/api/billing/checkout/route.ts`,
  `app/api/billing/portal/route.ts`, `app/api/billing/cancel/route.ts`,
  `app/api/billing/change-plan/route.ts`, `app/api/webhooks/stripe/route.ts`,
  `app/onboarding/page.tsx`, `app/(protected)/billing/page.tsx`,
  `app/(protected)/billing/plans/page.tsx`,
  `app/(protected)/billing/invoices/page.tsx`,
  `app/(protected)/billing/invoices/actions.ts`,
  `app/(protected)/superadmin/page.tsx`.
- 2026-07-18 (backlog) — créé suite à la décision de l'utilisateur de migrer
  vers un modèle de facturation par owner plutôt que de garder un abonnement
  par organisation (voir échange précédent : « pourquoi tu ne gères pas les
  plans par user owner ? »). Remplace le mécanisme de dérogation
  `Organization.maxUsersOverride`/dérivation multi-orgs initialement prévu
  dans ITEM-093. Impacte les modèles livrés par ITEM-020 (Plan/Subscription/
  Invoice) — non réécrit ici, journal ajouté sur ITEM-020/021/022/023/024/026
  pour tracer la dépendance vers cette migration.
