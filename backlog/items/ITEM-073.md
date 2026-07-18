---
id: ITEM-073
title: Assistant d'inscription — organisation (nom, logo) et invitations
status: implemented
priority: P1
type: feature
estimate: M
depends_on: [ITEM-014, ITEM-016, ITEM-049]
created: 2026-07-17
updated: 2026-07-17
---

## Idée / contexte
**Redéfinit le périmètre initial de cet item** (première version : simple checklist
dismissible sur le tableau de bord) à la demande explicite d'un assistant
d'inscription multi-étapes : après avoir créé son compte, le owner doit configurer
son organisation (nom, logo) et inviter son équipe **avant** d'atterrir sur le
tableau de bord — pas après, via une checklist optionnelle.

Aujourd'hui (ITEM-014), `/register` collecte nom/e-mail/mot de passe **et** le nom
d'organisation sur un seul formulaire, crée l'organisation immédiatement après
`signUp.email()`, puis redirige directement vers `/dashboard`. Ce flux est
restructuré par cet item : le formulaire d'inscription ne collecte plus que
nom/e-mail/mot de passe ; la création de l'organisation devient la première étape
d'un nouvel assistant `/onboarding`, suivie d'une étape d'invitations. La sélection
de plan (3e étape) est traitée séparément par ITEM-074, qui s'enchaîne à la suite de
celui-ci.

## User story
En tant que nouvel utilisateur qui vient de créer son compte, je veux configurer mon
organisation (nom, logo) et inviter mon équipe à travers un parcours guidé, afin
d'arriver sur mon tableau de bord avec un compte déjà prêt à l'usage.

## Critères d'acceptation
- [x] `/register` ne collecte plus que nom/e-mail/mot de passe (le champ
      « Organisation » est retiré) ; après création du compte, l'utilisateur est
      redirigé vers un nouvel assistant `/onboarding` plutôt que directement vers
      `/dashboard`.
- [x] Étape 1 (Organisation) : formulaire nom (obligatoire) + logo (optionnel, URL —
      même validation que `brandingSchema`/ITEM-049). La validation crée
      l'organisation (`createOrganizationWithOwner`, owner = l'utilisateur) et
      applique le logo s'il a été renseigné.
- [x] Étape 2 (Invitations) : un ou plusieurs e-mails à inviter (réutilise
      `createInvitationAction`, ITEM-008/016), avec un bouton explicite « Passer
      cette étape » — aucune adresse n'est requise pour continuer.
- [x] À l'issue de l'étape 2, l'utilisateur passe à l'étape de sélection de plan
      (ITEM-074) si elle est implémentée, sinon (tant qu'ITEM-074 n'est pas livré)
      est redirigé directement vers `/dashboard`.
- [x] Un utilisateur qui accède directement à `/onboarding` alors qu'il a déjà une
      organisation est redirigé vers `/dashboard` (l'assistant ne se rejoue pas pour
      un compte déjà configuré).
- [x] Un visiteur non authentifié qui accède à `/onboarding` est redirigé vers
      `/login`.

## Notes techniques
Restructure un flux existant et déjà `verified` (ITEM-014) — pas une extension
isolée : `app/(auth)/register/page.tsx`/`actions.ts` perdent la logique de création
d'organisation (déplacée dans le nouvel assistant), `createOrganizationAction`
devient probablement `createOrganizationStepAction` (ou équivalent) dans
`app/onboarding/actions.ts`. Vérifier qu'aucun autre appelant ne dépend du
comportement actuel de `/register` avant de le modifier.

Étape Organisation : réutiliser `brandingSchema`/`updateBrandingAction`
(`lib/validators/organization.ts`, ITEM-049) pour le champ logo plutôt que dupliquer
la validation — appelée juste après `createOrganizationWithOwner` avec l'id de
l'organisation fraîchement créée.

Étape Invitations : réutiliser `createInvitationAction`
(`app/(protected)/admin/invitations/actions.ts`, ITEM-008/016) tel quel — accepte
déjà `email`/`role`, s'appuie sur `requireAdmin()`/`requireOrganization()` qui
fonctionneront puisque l'organisation vient d'être créée à l'étape précédente et
l'utilisateur en est owner.

Structure de route non prescrite précisément (à trancher à l'implémentation) : un
`app/onboarding/page.tsx` avec état d'étape en query param (`?step=organisation|
invitations`) ou en état client, tant que l'accès direct à une étape ultérieure sans
organisation existante reste géré proprement (redirection, pas d'erreur brute).
`/onboarding` doit rester joignable sans organisation active (contrairement à la
plupart des pages `(protected)`, qui supposent `requireOrganization()`) — étape 1
n'a justement pas encore d'organisation avant sa propre soumission.

Essai gratuit : aucune action nouvelle requise ici — `createOrganizationWithOwner`
appelle déjà `startTrialSubscription` (ITEM-024), qui démarre automatiquement un
essai de 14 jours sans plan choisi dès l'étape 1. C'est ITEM-074 qui expose ensuite
le choix explicite d'un plan payant par-dessus cet essai déjà actif.

Décisions à l'implémentation :
- **`app/(auth)/register/actions.ts` supprimé** (plus aucun appelant) — sa seule
  fonction (`createOrganizationAction`) est remplacée par
  `createOnboardingOrganizationAction` dans le nouveau `app/onboarding/actions.ts`.
  `registerOrganizationNameSchema` (nom optionnel, avec repli automatique) retiré de
  `lib/validators/organization.ts` et remplacé par `onboardingOrganizationSchema`
  (nom **obligatoire** — une étape dédiée peut se permettre d'exiger une vraie
  saisie, contrairement à l'ancien champ noyé dans le formulaire d'inscription).
- **Route `app/onboarding/`, hors des groupes `(auth)`/`(protected)`** : exige une
  session (contrairement à `(auth)`) mais pas encore d'organisation active
  (contrairement à toutes les pages `(protected)`, qui supposent
  `requireOrganization()`) — l'étape 1 n'en a justement pas encore avant sa propre
  soumission. Garde à deux sens : sans session → `/login` ; avec une organisation
  déjà existante → `/dashboard` (l'assistant ne se rejoue pas).
- **`OnboardingWizard.tsx` : un seul composant client, état d'étape en `useState`
  local** (pas de query params ni de sous-routes par étape) : les deux étapes
  dépendent l'une de l'autre (l'étape invitations a besoin de l'organisation créée à
  l'étape précédente) et rien n'exige que chaque étape soit individuellement
  liable/partageable par URL. Étape 1 utilise `useActionState` (même schéma que le
  reste du repo — `BrandingForm`, etc.), avance à l'étape 2 dès `state.success`.
  Étape 2 appelle `createInvitationAction` directement (pas via `useActionState`,
  qui suppose un seul formulaire) une fois par e-mail non vide saisi, dans un
  `useTransition` — jusqu'à 5 adresses, ajout/retrait de lignes.
- **Logo appliqué directement via `prisma.organization.update`**, pas via
  `updateBrandingAction` : cette action-là retrouve l'organisation à partir de la
  `Membership` déjà active de l'appelant pour vérifier ses droits — inutile ici,
  l'organisation vient d'être créée dans la même action serveur, son owner y est
  forcément autorisé.
- **e2e** : `e2e/helpers/auth.ts#signUpAndCreateOrganization` (utilisé aussi par
  `billing.spec.ts`/`documents.spec.ts`) mis à jour pour suivre le nouveau parcours
  (`/register` → remplir le nom d'organisation sur `/onboarding` → « Passer cette
  étape » sur les invitations → `/dashboard`) — signature externe inchangée, les
  deux autres specs n'ont pas eu besoin d'être modifiées.
- **Hors périmètre, non traité** : un utilisateur qui navigue manuellement vers
  `/dashboard` avant de terminer l'assistant (ex. bouton précédent du navigateur
  après `/register`) voit un tableau de bord vide plutôt que d'être renvoyé vers
  `/onboarding` — `/dashboard` utilise déjà `getCurrentOrganization()` (pas
  `requireOrganization()`) et tolère une organisation absente sans planter. Forcer
  ce cas à rediriger vers l'assistant n'est pas demandé par les critères
  d'acceptation et toucherait la garde d'accès du tableau de bord lui-même — à
  cadrer comme item séparé si ce comportement doit changer.

Vérifications effectuées : `npx tsc --noEmit`, `npx eslint` (fichiers touchés), `npx
vitest run` (60 tests, inchangés), `npx next build` (`/onboarding` listée). Testé en
conditions réelles contre le serveur `next dev` déjà lancé (port 3000, non
redémarré) : `/register` ne montre plus le champ « Organisation » ; un utilisateur
fraîchement inscrit (créé via l'API d'auth réelle) atterrit sur `/onboarding` et y
voit l'étape 1 (« Configurez votre organisation », champs `name`/`logo`) ; un owner
qui a déjà une organisation reçoit un 307 de `/onboarding` vers `/dashboard` ; un
visiteur non authentifié reçoit un 307 de `/onboarding` vers `/login`. La suite e2e
Playwright (`e2e/signup.spec.ts`, webServer dédié port 3100) n'a pas pu être lancée
dans cette session : Next.js (Turbopack) verrouille `.next/dev/lock` par projet, en
conflit avec le serveur `next dev` du port 3000 déjà en cours (non démarré par moi,
pas arrêté pour ne pas perturber un autre usage en cours) — la soumission réelle des
formulaires de l'assistant (clic, `useActionState`, création effective de
l'organisation via l'UI) n'a donc été vérifiée que par lecture de code et par les
redirections ci-dessus, pas par un parcours navigateur complet. À confirmer par
`backlog-test` (ou en relançant `npx playwright test e2e/signup.spec.ts` une fois le
port 3000 libre).

Fichiers : `app/(auth)/register/page.tsx`, `app/(auth)/register/actions.ts`
(supprimé), `app/onboarding/page.tsx` (nouveau), `app/onboarding/actions.ts`
(nouveau), `components/onboarding/OnboardingWizard.tsx` (nouveau),
`lib/validators/organization.ts`, `e2e/helpers/auth.ts`, `e2e/signup.spec.ts`.

## Captures attendues
Formulaire d'inscription simplifié (sans champ organisation) ; étape 1 de
l'assistant (nom + logo) ; étape 2 (invitations, avec l'option « Passer ») ;
tableau de bord atteint en fin de parcours avec l'organisation et son logo
visibles dans la sidebar (`OrgSwitcher`) ; suite `e2e/signup.spec.ts` exécutée avec
succès (`npx playwright test e2e/signup.spec.ts`).

## Journal
- 2026-07-17 (backlog) — créé, à partir de la demande d'onboarding pour faciliter le
  paramétrage du compte owner ; portée initiale limitée à une checklist dismissible.
- 2026-07-17 (backlog) — **redéfini** en assistant d'inscription multi-étapes
  (organisation + invitations) à la demande explicite de l'utilisateur, qui veut que
  la création d'organisation et les invitations fassent partie du parcours
  d'inscription lui-même, pas d'une checklist optionnelle après coup. La sélection
  de plan (3e étape demandée) est scindée dans un nouvel item séparé (ITEM-074) pour
  rester sur des items M plutôt qu'un seul XL.
- 2026-07-17 (implement) — démarrage
- 2026-07-17 (implement) — implémenté : `/register` simplifié (nom/e-mail/mot de
  passe uniquement), nouvel assistant `/onboarding` (étape organisation avec
  nom+logo, étape invitations skippable), `createOrganizationAction` déplacé et
  remplacé par `createOnboardingOrganizationAction`, helpers/specs e2e mis à jour en
  conséquence. Fichiers listés en Notes techniques.
