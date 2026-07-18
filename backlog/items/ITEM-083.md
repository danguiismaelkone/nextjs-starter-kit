---
id: ITEM-083
title: Page profil — regrouper Nom/Mot de passe/E-mail/Téléphone sous une section « Utilisateur »
status: implemented
priority: P2
type: chore
estimate: S
depends_on: [ITEM-045]
created: 2026-07-18
updated: 2026-07-18
---

## Idée / contexte
Captures d'écran de référence (page « Informations personnelles » d'un SaaS
tiers) : une section « Utilisateur » unique regroupe Nom, Mot de passe, E-mail,
E-mail secondaire et Téléphone du contact, avec un bouton « Modifier » global.

`/profile` (`app/(protected)/profile/page.tsx`, ITEM-045) affiche aujourd'hui
trois cartes séparées et toujours éditables (`AvatarSection`, `ProfileForm` —
Nom/Téléphone/Bio, `ChangePasswordForm`), et **n'affiche pas l'e-mail** du
compte alors qu'il existe (`session.user.email`).

Cet item **reprend le regroupement visuel** de la capture, **ajusté aux
éléments réellement disponibles** dans ce projet :
- Nom, Téléphone : déjà éditables (`ProfileForm`) → à regrouper.
- Mot de passe : déjà modifiable (`ChangePasswordForm`) → à regrouper dans la
  même section (visuellement, pas forcément le même formulaire HTML).
- E-mail : existe en base et en session mais **n'est actuellement affiché nulle
  part sur `/profile`** → à ajouter en **lecture seule** (aucun flux de
  changement d'e-mail n'existe dans ce projet, hors périmètre de cet item).
- E-mail secondaire : **n'existe pas** dans le modèle `User` ni dans Better
  Auth côté ce projet → **ne pas l'ajouter** (pas de champ inventé).
- Bio : existe (`ProfileForm`) mais absente de la capture de référence → reste
  accessible sur la page (ne pas perdre une fonctionnalité existante), en
  dehors de la nouvelle section « Utilisateur » si besoin.
- Avatar : existe (`AvatarSection`), absent de la capture → conservé tel quel,
  hors du regroupement demandé.

Hors périmètre (n'existent pas dans ce projet, volontairement exclus) : Compte
Google (pas de `socialProviders` configuré côté Better Auth), Clés d'accès /
WebAuthn (aucune trace dans le code), Langue (pas d'i18n). 2FA/Sessions
existent bien mais ailleurs (`/settings/security`) — traités séparément par
ITEM-084 pour garder cet item S/M et indépendamment vérifiable.

## User story
En tant qu'utilisateur, je veux retrouver mes informations de compte (nom, mot
de passe, e-mail, téléphone) regroupées sous une seule section « Utilisateur »
sur `/profile`, afin de m'y retrouver comme sur la page de référence, sans
chercher mon e-mail nulle part alors qu'il existe déjà.

## Critères d'acceptation
- [x] `/profile` affiche une section unique intitulée « Utilisateur »
      regroupant visuellement Nom, Mot de passe, E-mail et Téléphone (plus de
      3 cartes top-level séparées pour ces champs).
- [x] L'e-mail du compte (`session.user.email`) est affiché en lecture seule
      dans cette section (aucune valeur inventée, aucun champ « e-mail
      secondaire »).
- [x] Modifier le nom, le téléphone ou le mot de passe reste fonctionnel après
      la refonte (mêmes actions `authClient.updateUser`/`authClient.changePassword`
      qu'aujourd'hui, aucune régression fonctionnelle).
- [x] La Bio reste modifiable quelque part sur `/profile` (non supprimée).
- [x] L'avatar reste modifiable quelque part sur `/profile` (non supprimé).
- [x] Le titre de la page devient « Informations personnelles » (au lieu de
      « Mon profil »), comme dans la capture de référence.
- [x] Aucune section n'est ajoutée pour Compte Google / Clés d'accès /
      E-mail secondaire / Langue (fonctionnalités absentes de ce projet).

## Notes techniques
Fichiers concernés : `app/(protected)/profile/page.tsx`,
`components/profile/ProfileForm.tsx`, `components/profile/ChangePasswordForm.tsx`
(existants, à réorganiser plutôt qu'à réécrire depuis zéro — la logique de
soumission ne change pas).

Piste : une seule `Card` « Utilisateur » avec des lignes label/valeur (Nom,
Mot de passe, E-mail, Téléphone), soit avec des champs directement éditables
inline (cohérent avec le pattern déjà utilisé partout ailleurs dans ce projet :
formulaires toujours éditables + bouton "Enregistrer", ex. `OrganizationForm`,
`BrandingForm`), soit avec un bouton « Modifier » ouvrant un dialog/état
d'édition (plus fidèle à la capture, mais introduit un nouveau pattern
d'interaction absent du reste de l'app). **Décision laissée à
l'implémentation** entre ces deux options — privilégier la cohérence avec le
reste de l'app (formulaires inline) sauf si le bouton « Modifier » s'implémente
sans complexité disproportionnée pour une page S.

Pas de module FATIHOUNE dédié (page déjà custom, ITEM-045).

Décision à l'implémentation : formulaires inline conservés (cohérence avec le
reste de l'app) plutôt qu'un bouton « Modifier » à bascule — `ProfileForm` et
`ChangePasswordForm` retirent leur `Card` propre (désormais des champs/`form`
nus) et sont composés dans une unique `Card` « Utilisateur » sur
`app/(protected)/profile/page.tsx`, avec une ligne E-mail en lecture seule
(`session.user.email`) et un `Separator` entre les infos de profil et le
changement de mot de passe. Logique de soumission des deux formulaires
inchangée (aucune régression). Fichiers modifiés :
`app/(protected)/profile/page.tsx`, `components/profile/ProfileForm.tsx`,
`components/profile/ChangePasswordForm.tsx`. `npx tsc --noEmit` et `npx eslint`
(fichiers touchés) OK ; aucun test (unitaire/e2e) ne référence la structure
`Card` retirée.

## Captures attendues
`/profile` avant/après : la section « Utilisateur » avec Nom/Mot de
passe/E-mail/Téléphone regroupés, l'e-mail visible pour la première fois, et
le titre « Informations personnelles ».

## Journal
- 2026-07-18 (backlog) — créé à partir de deux captures d'écran de référence
  (page « Informations personnelles » d'un SaaS tiers) ; périmètre limité aux
  champs déjà existants (Nom/Téléphone/Bio/Mot de passe/E-mail), à l'exclusion
  du Compte Google, des Clés d'accès, de l'E-mail secondaire et de la Langue
  (absents de ce projet). 2FA/Sessions scindés dans ITEM-084 (dépendance de
  taille, existent déjà mais sur une autre page).
- 2026-07-18 (implement) — démarrage
- 2026-07-18 (implement) — implémenté : section « Utilisateur » unique
  (Nom/Téléphone/Bio/E-mail lecture seule/Mot de passe) sur `/profile`, titre
  renommé « Informations personnelles ». Fichiers :
  `app/(protected)/profile/page.tsx`, `components/profile/ProfileForm.tsx`,
  `components/profile/ChangePasswordForm.tsx`.
