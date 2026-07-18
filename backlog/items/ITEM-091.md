---
id: ITEM-091
title: Page /billing — lien manquant pour changer de plan une fois abonné (y compris en essai)
status: implemented
priority: P1
type: bug
estimate: S
depends_on: [ITEM-023, ITEM-024]
created: 2026-07-18
updated: 2026-07-18
---

## Idée / contexte
Sur `/billing`, le lien vers `/billing/plans` (« page des tarifs ») ne s'affiche que
dans la branche `{!subscription && (...)}` de `app/(protected)/billing/page.tsx`. Or
`createOrganizationWithOwner()` (ITEM-014) appelle systématiquement
`startTrialSubscription()` (ITEM-024) à la création de l'organisation : toute
organisation a donc une `Subscription` (statut `trialing`) dès le départ, sans
`stripeCustomerId` ni `stripeSubscriptionId`. Conséquence dans
`components/billing/SubscriptionStatus.tsx` :
- `ManageBillingButton` (portail Stripe) ne s'affiche que si `hasStripeCustomer`
  (faux tant qu'aucun checkout n'a eu lieu) ;
- `CancelModal` ne s'affiche que si `hasStripeSubscription` (faux en essai) ;
- le lien « page des tarifs » de `billing/page.tsx` ne s'affiche que si
  `!subscription` (faux dès qu'un essai existe).

Résultat : un utilisateur en période d'essai (l'état par défaut de toute nouvelle
organisation) arrive sur `/billing` et n'y voit **aucun bouton ni lien actionnable**
pour choisir/changer de plan — seuls le nom du plan, le badge de statut et le
compte à rebours d'essai sont affichés. Le seul chemin restant vers
`/billing/plans` est la carte du hub `/settings` (ITEM-082), ce qui n'est pas
l'endroit où un utilisateur s'attend à devoir chercher pour gérer son abonnement
depuis la page qui s'appelle justement « Facturation ».

## User story
En tant qu'admin d'organisation (y compris en période d'essai), je veux voir un
lien clair vers la sélection de plan directement sur `/billing`, afin de pouvoir
mettre à jour mon abonnement sans devoir deviner qu'il faut repasser par le hub
`/settings`.

## Critères d'acceptation
- [x] Sur `/billing`, un bouton/lien vers `/billing/plans` est visible **quel que
      soit l'état de l'abonnement** (aucun abonnement, essai en cours, abonnement
      payant actif) — pas seulement quand `subscription` est `null`.
- [x] Le libellé reflète l'état : « Choisir un plan » si aucun plan n'est encore
      sélectionné (`subscription.planName === null`, y compris en essai sans plan
      choisi), « Changer de plan » si un plan payant est déjà actif.
- [x] Le comportement existant de `ManageBillingButton` (portail Stripe) et
      `CancelModal` reste inchangé (toujours conditionnés à `hasStripeCustomer` /
      `hasStripeSubscription` — Stripe n'a rien à gérer tant qu'aucun paiement n'a
      eu lieu).
- [ ] Vérifié en conditions réelles pour une organisation en essai fraîchement
      créée (`stripeCustomerId` et `stripeSubscriptionId` tous deux `null`) : le
      lien vers `/billing/plans` est bien présent et fonctionnel. — non couvert ici
      (typecheck + eslint uniquement) ; à valider par `backlog-verify`/`backlog-test`
      en navigateur.

## Notes techniques
Correctif ciblé, pas de nouveau modèle ni de nouvelle route.

**Décision prise** : emplacement `components/billing/SubscriptionStatus.tsx`
plutôt que `PageHeader` de `billing/page.tsx` — le bouton « Choisir un
plan »/« Changer de plan » vit naturellement à côté de `ManageBillingButton` /
`CancelModal`, qui sont les deux autres actions de gestion d'abonnement, et le
composant a déjà accès à `subscription.planName` pour choisir le libellé sans
prop supplémentaire.

- `components/billing/SubscriptionStatus.tsx` : ajout d'un `Button asChild`
  (`variant="outline"`) avec `<Link href="/billing/plans">`, dans les deux
  branches du composant :
  - branche `!subscription` (`Card` « Aucun abonnement ») : libellé fixe
    « Choisir un plan », ajouté dans le `CardHeader` (auparavant sans aucune
    action).
  - branche avec `subscription` : libellé conditionnel
    (`subscription.planName ? "Changer de plan" : "Choisir un plan"`), ajouté en
    tête du groupe de boutons existant (`ManageBillingButton`/`CancelModal`),
    inconditionnel — ne dépend ni de `hasStripeCustomer` ni de
    `hasStripeSubscription`.
- `app/(protected)/billing/page.tsx` : suppression du paragraphe
  `{!subscription && (...)}` (lien vers `/billing/plans` en texte, devenu
  redondant avec le bouton ajouté dans `SubscriptionStatus`) — évite la
  duplication mentionnée ci-dessus. L'import `Link` reste utilisé par le bouton
  « Voir les factures » du `PageHeader`.
- Aucun changement côté `/billing/plans`, `PlanGrid`/`PlanCard` (ITEM-021/024) :
  ces composants géraient déjà correctement souscription initiale et
  upgrade/downgrade ; seul le point d'entrée depuis `/billing` manquait.

## Captures attendues
Page `/billing` pour une organisation en essai (sans `stripeCustomerId`) montrant
un lien/bouton « Choisir un plan » visible et cliquable, menant à
`/billing/plans`.

## Journal
- 2026-07-18 (backlog) — créé : bug remonté par l'utilisateur (« ya aucun lien
  pour permettre a un utilisateur de mettre a jour son abonnement »), confirmé en
  lisant `app/(protected)/billing/page.tsx` et
  `components/billing/SubscriptionStatus.tsx` — le lien vers `/billing/plans`
  n'existe que dans la branche `!subscription`, qui n'est jamais atteinte une fois
  l'essai automatique (ITEM-024) démarré.
- 2026-07-18 (implement) — démarrage
- 2026-07-18 (implement) — implémenté : bouton « Choisir un plan »/« Changer de
  plan » (lien vers `/billing/plans`) ajouté dans `SubscriptionStatus`, visible
  dans les deux branches (avec/sans abonnement) et indépendant de
  `hasStripeCustomer`/`hasStripeSubscription` ; suppression du lien texte devenu
  redondant dans `billing/page.tsx`. `tsc --noEmit` et `eslint` passent sans
  erreur sur les fichiers touchés. Fichiers :
  `components/billing/SubscriptionStatus.tsx`,
  `app/(protected)/billing/page.tsx`.
