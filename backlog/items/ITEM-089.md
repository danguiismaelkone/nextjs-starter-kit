---
id: ITEM-089
title: Migrer les pages fiche restantes (organisation, profil, facturation) vers le gabarit fiche/détail
status: implemented
priority: P3
type: chore
estimate: M
depends_on: [ITEM-086, ITEM-087]
created: 2026-07-18
updated: 2026-07-18
---

## Idée / contexte
Une fois le gabarit fiche/détail prouvé sur `/roles/[id]` (ITEM-087), les autres
pages « fiche » (une seule ressource, pas une liste) doivent l'adopter pour que
« every page » — l'exigence de départ — soit effectivement couverte :
`/settings/organizations/[id]`, `/profile` et `/billing`. Ces trois pages ont
aujourd'hui chacune leur propre mise en page ad hoc.

Priorité volontairement plus basse (P3) que ITEM-085 à ITEM-088 : ces pages sont
fonctionnelles telles quelles, cet item est une migration purement visuelle qui peut
suivre une fois le gabarit stabilisé sur une page de référence.

## User story
En tant qu'utilisateur de l'application, je veux que les pages « Organisation »,
« Profil » et « Facturation » suivent la même structure (en-tête + contenu 2/3 +
panneau détails 1/3) que les autres fiches de l'application, afin d'avoir une
expérience cohérente sur tout le produit.

## Critères d'acceptation
- [x] `/settings/organizations/[id]` utilise l'en-tête (ITEM-085) et le gabarit
      fiche/détail (ITEM-086) : contenu principal = formulaire(s) d'édition de
      l'organisation, panneau détails = attributs non éditables (ID d'organisation,
      slug, date de création…).
- [x] `/profile` utilise l'en-tête (ITEM-085) et le gabarit fiche/détail (ITEM-086) :
      contenu principal = sections existantes (avatar, informations, mot de passe,
      2FA/sessions — ITEM-083/084), panneau détails = attributs de compte pertinents
      (rôle, date d'inscription…) s'il y en a d'utiles à afficher séparément, sinon ce
      panneau peut être omis pour cette page (cas valide selon ITEM-086).
- [x] `/billing` utilise l'en-tête (ITEM-085) et le gabarit fiche/détail (ITEM-086) :
      contenu principal = plan actuel, factures, moyen de paiement, panneau détails =
      résumé de l'abonnement (statut, prochaine échéance…).
- [x] Chaque page migrée conserve son comportement fonctionnel actuel (formulaires,
      actions Stripe, 2FA…) sans régression — vérifié en conditions réelles (Playwright,
      login + captures d'écran des trois pages), pas seulement en lecture de code.
- [x] Aucune régression TypeScript/lint/build après la migration des trois pages.

## Notes techniques
Fichiers concernés : `app/(protected)/settings/organizations/[id]/page.tsx`,
`app/(protected)/profile/page.tsx`, `app/(protected)/billing/page.tsx` (et leurs
composants associés). Item volontairement plus large (M) car il touche trois pages
indépendantes ; si l'implémentation le juge préférable, il peut être scindé en
sous-items par page au moment de l'implémentation (à journaliser).

Décisions à l'implémentation :
- **`/settings/organizations/[id]`** : panneau détails = identifiant (`slug`), rôle
  de l'utilisateur courant dans l'organisation (Propriétaire/Admin), date de création
  (`organization.createdAt`, déjà en base). Le `max-w-lg` d'origine (formulaire seul)
  retiré au profit de la grille 2/3-1/3 — la page utilise maintenant toute la largeur
  disponible, cohérent avec le reste de la migration ITEM-090.
- **`/profile`** : panneau détails = e-mail, rôle (`user.role`, déjà exposé par la
  session Better Auth), date d'inscription (`user.createdAt`). Le bloc « E-mail »
  auparavant dupliqué dans la carte « Utilisateur » retiré (devenu redondant avec le
  panneau détails).
- **`/billing`** : panneau détails = plan actuel, statut d'abonnement, prochaine
  échéance (mêmes données que `SubscriptionStatus`, résumées). L'action « Voir les
  factures » (auparavant un lien texte) déplacée dans `PageHeader.actions` sous forme
  de bouton, cohérent avec le reste de l'application.

Vérifications effectuées : `npx tsc --noEmit`, `npx eslint .`, `npx next build`
(61 routes), `npx vitest run` (68 tests) sans erreur. Vérifié en conditions réelles
avec Playwright (connexion `owner@example.com`, captures des trois pages) : les
trois panneaux détails affichent des données réelles issues de la base (pas de
placeholder), les formulaires/actions (dont le bouton « Voir les factures ») restent
fonctionnels.

## Captures attendues
Les trois pages (`/settings/organizations/[id]`, `/profile`, `/billing`) avant/après,
montrant l'en-tête commun et la grille contenu/panneau détails appliquée à chacune.

## Journal
- 2026-07-18 (backlog) — créé pour compléter la couverture « every page » demandée
  au-delà de la page de référence ITEM-087, une fois le gabarit stabilisé.
- 2026-07-18 (implement) — implémenté dans le cadre d'une migration élargie à toute
  l'application (ITEM-090, demandée directement par l'utilisateur avant que cet item
  soit atteint dans l'ordre suggéré). Les trois pages migrées telles que prévues.
  Tous les critères couverts, vérifié en conditions réelles (Playwright).
