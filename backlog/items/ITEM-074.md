---
id: ITEM-074
title: Sélection de plan à l'inscription — paiement immédiat ou essai 14 jours
status: implemented
priority: P1
type: feature
estimate: M
depends_on: [ITEM-073, ITEM-021]
created: 2026-07-17
updated: 2026-07-18
---

## Idée / contexte
Troisième étape de l'assistant d'inscription introduit par ITEM-073 (organisation →
invitations → **plan**), explicitement demandée : à l'inscription, tout nouvel
utilisateur voit les plans disponibles et peut soit payer immédiatement (Stripe
Checkout, déjà en place — ITEM-021), soit ignorer cette étape, auquel cas il
continue sur l'essai gratuit de 14 jours déjà démarré automatiquement à la création
de son organisation (`startTrialSubscription`, ITEM-024 — comportement inchangé, pas
un nouveau mécanisme).

> Interprétation retenue pour « tous les utilisateurs devront choisir leur [plan] » :
> l'étape est **toujours présentée** (jamais masquée/sautée automatiquement), mais
> **aucun choix n'est obligatoire** pour continuer — un bouton explicite « Continuer
> avec l'essai gratuit » est toujours disponible à côté des plans payants. Cette
> lecture concilie la première phrase (« devront choisir ») avec la seconde
> (« pourront... ignorer, auquel cas ils auront 14 jours ») de la demande d'origine.
> À confirmer si cette interprétation ne correspond pas à l'intention.

## User story
En tant que nouvel utilisateur en fin d'inscription, je veux voir les plans
disponibles et choisir de payer maintenant ou de continuer avec l'essai gratuit,
afin de démarrer sur le plan qui me convient sans devoir chercher `/billing/plans`
plus tard.

## Critères d'acceptation
- [x] À la suite de l'étape « Invitations » d'ITEM-073, l'assistant affiche une
      étape « Plan » listant les plans actifs réels (`Plan`, `isActive: true`) avec
      leur prix et fonctionnalités — même contenu que `/billing/plans`, pas des
      données inventées.
- [x] Choisir « Souscrire » sur un plan payant lance le flux Stripe Checkout déjà en
      place (`POST /api/billing/checkout`, ITEM-021) ; au retour de Stripe
      (paiement réussi), l'utilisateur atterrit sur `/dashboard` avec son
      abonnement synchronisé (réutilise `syncSubscriptionFromCheckoutSession`,
      pas une resynchronisation dupliquée).
- [x] Un bouton « Continuer avec l'essai gratuit (14 jours) », toujours visible sur
      cette étape, mène directement à `/dashboard` sans appel à Stripe — l'essai
      déjà démarré (ITEM-024) n'est pas modifié.
- [x] Annuler un paiement Stripe en cours (retour via `cancel_url`) ramène
      l'utilisateur sur l'étape « Plan » de l'assistant (pas une erreur, pas une
      sortie du parcours) pour qu'il puisse réessayer ou continuer avec l'essai.
- [x] Cette étape n'est présentée qu'une fois, à l'inscription — un owner qui a déjà
      terminé l'assistant (ITEM-073) et revisite `/onboarding` est redirigé vers
      `/dashboard`, pas renvoyé à l'étape plan.

## Notes techniques
`POST /api/billing/checkout` (`app/api/billing/checkout/route.ts`) code aujourd'hui
en dur `success_url`/`cancel_url` vers `/billing/plans?...` — à généraliser pour
rediriger vers l'étape plan de l'assistant plutôt que de dupliquer l'endpoint.
Option la plus simple : accepter un paramètre optionnel `returnTo` dans le corps de
la requête (`planIdSchema` étendu), **validé comme chemin relatif same-origin**
(regex du type `^/[^/].*$` ou équivalent, jamais une URL absolue/externe — sinon
open redirect) ; défaut `/billing/plans` si absent, pour ne pas casser le bouton
« Souscrire » déjà utilisé par `PlanCard`/`/billing/plans`.

Le retour de Checkout (paramètre `session_id`) doit être traité par la même logique
que `/billing/plans` (`syncSubscriptionFromCheckoutSession`, appelée côté serveur
avant rendu) — si l'étape plan de l'assistant vit sur une route différente, cette
synchronisation doit y être dupliquée ou factorisée dans une fonction partagée,
plutôt que copiée-collée telle quelle.

Plans sans `stripePriceId` configuré (facturation Stripe non branchée en local/dev,
cf. notes ITEM-021/070) : le flux « Souscrire » échoue proprement avec le message
d'erreur déjà renvoyé par l'API (422) — l'essai gratuit reste toujours disponible
comme repli, donc cet item reste testable même sans Stripe configuré.

Décisions à l'implémentation :
- **`returnTo` (`lib/validators/billing.ts`)** : ajouté à `planIdSchema`, validé par
  une regex n'acceptant qu'un chemin relatif commençant par un seul `/` (rejette les
  URLs absolues et les URLs protocol-relative `//evil.com`, qui ouvriraient un open
  redirect via `success_url`/`cancel_url` de Stripe Checkout). Vérifié avec quelques
  cas (`/onboarding` accepté, `//evil.com`/`http://evil.com`/`\\evil.com` rejetés).
  `POST /api/billing/checkout` retombe sur `/billing/plans` si absent — comportement
  du bouton « Souscrire » existant totalement inchangé.
- **Un seul paramètre `returnTo` sert à la fois `success_url` et `cancel_url`** (même
  page) : l'étape « Plan » de l'assistant (`/onboarding`) distingue les deux cas
  elle-même via les query params à l'atterrissage (`session_id` = paiement réussi,
  `canceled` = annulé) plutôt que d'avoir deux routes de retour séparées.
  `PlanCard`/`PlanGrid` étendus d'une prop `returnTo` optionnelle, transmise telle
  quelle au corps de la requête — mêmes composants réutilisés par `/billing/plans`
  (sans `returnTo`) et par l'étape « Plan » de l'assistant (`returnTo="/onboarding"`),
  pas de duplication du flux Stripe Checkout.
- **`app/onboarding/page.tsx`** : au retour avec `session_id`, appelle
  `syncSubscriptionFromCheckoutSession` (déjà utilisée par `/billing/plans`, pas
  redupliquée) puis `redirect("/dashboard")` immédiatement — l'utilisateur ne revoit
  jamais l'assistant après un paiement réussi. Au retour avec `canceled`, ne
  redirige pas et affiche l'étape « Plan » via `initialStep="plan"`.
- **Bug détecté et corrigé en testant réellement** (pas seulement en lisant le
  code) : `initialStep={canceled ? "plan" : "organisation"}` était calculé
  indépendamment de l'existence de l'organisation — un utilisateur fraîchement
  inscrit (sans organisation) visitant `/onboarding?canceled=1` (paramètre qui ne
  devrait jamais apparaître avant l'étape 1, mais un paramètre de requête reste
  falsifiable) atterrissait directement sur l'étape « Plan » sans être passé par la
  création d'organisation. Corrigé : `initialStep = organization && canceled ?
  "plan" : "organisation"` — `canceled` n'a d'effet que si une organisation existe
  déjà.
- **Étape « Plan » ignorée si aucun plan actif** (`plans.length === 0`) : passe
  directement à `/dashboard` depuis la fin de l'étape invitations plutôt que
  d'afficher une étape vide — cohérent avec la landing page (ITEM-072), qui masque
  déjà sa section tarifs dans ce cas.

Vérifications effectuées : `npx tsc --noEmit`, `npx eslint` (fichiers touchés), `npx
vitest run` (60 tests, inchangés). `npx next build` OK. Testé en conditions réelles
contre le serveur `next dev` déjà lancé (port 3000, non redémarré), avec un compte
fraîchement inscrit et le owner de démo (déjà abonné à l'essai gratuit, sans plan) :
`/onboarding?canceled=1` pour un compte sans organisation affiche bien l'étape 1
(pas l'étape plan — bug ci-dessus corrigé après l'avoir observé) ; le même paramètre
pour le owner (organisation existante) affiche bien l'étape « Plan » avec les 4
plans réels et leurs vrais prix (Gratuit/29 $US/99 $US/299 $US) et le bouton
« Continuer avec l'essai gratuit » ; `/onboarding` sans paramètres pour le owner
redirige toujours vers `/dashboard` (critère 5, non régressé) ; `/billing/plans`
inchangé après l'extension de `PlanCard`/`PlanGrid`. Le paiement réussi
(`session_id` réel + synchronisation) et l'appel Stripe Checkout lui-même n'ont pas
été déclenchés de bout en bout (nécessiterait une carte de test Stripe réelle) — la
logique de synchronisation/redirection est vérifiée par lecture de code
(`syncSubscriptionFromCheckoutSession`, déjà exercée par `/billing/plans`).

Fichiers : `lib/validators/billing.ts`, `app/api/billing/checkout/route.ts`,
`components/billing/PlanCard.tsx`, `components/billing/PlanGrid.tsx`,
`app/onboarding/page.tsx`, `components/onboarding/OnboardingWizard.tsx`.

## Captures attendues
Étape « Plan » de l'assistant avec les plans réels et le bouton « Continuer avec
l'essai gratuit » ; retour réussi de Stripe Checkout atterrissant sur `/dashboard`
avec l'abonnement synchronisé ; retour annulé ramenant sur l'étape « Plan » ;
passage direct à l'essai gratuit sans appel Stripe.

## Journal
- 2026-07-17 (backlog) — créé en scindant la demande d'onboarding (organisation +
  invitations + plan) : la partie « sélection de plan / paiement à l'inscription »
  devient cet item séparé, à la suite d'ITEM-073, pour garder chaque item testable
  indépendamment et de taille M plutôt qu'un seul item XL.
- 2026-07-17 (implement) — démarrage
- 2026-07-18 (implement) — implémenté : étape « Plan » ajoutée à l'assistant
  d'inscription (`OnboardingWizard`), `returnTo` paramétrable sur
  `POST /api/billing/checkout` (validé contre l'open redirect), retour de Stripe
  Checkout (succès → sync + `/dashboard`, annulation → étape plan) géré dans
  `app/onboarding/page.tsx`. Bug réel trouvé et corrigé pendant la vérification
  manuelle (voir Notes techniques). Fichiers listés en Notes techniques.
