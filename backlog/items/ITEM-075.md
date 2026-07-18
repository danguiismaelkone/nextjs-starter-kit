---
id: ITEM-075
title: Upload de logo d'organisation (remplace le champ URL texte)
status: implemented
priority: P2
type: feature
estimate: M
depends_on: [ITEM-049, ITEM-073, ITEM-027, ITEM-045]
created: 2026-07-18
updated: 2026-07-18
---

## Idée / contexte
Le logo d'organisation (`Organization.logo`, ITEM-049) se saisit aujourd'hui via un
simple champ texte attendant une URL déjà hébergée ailleurs — dans
`BrandingForm.tsx` (réglages de l'organisation) et dans `OnboardingWizard.tsx`
(étape 1 de l'assistant d'inscription, ITEM-073). Capture d'écran fournie par
l'utilisateur : ce champ URL doit être remplacé par un vrai sélecteur de fichier
(upload direct), comme c'est déjà le cas pour l'avatar utilisateur (`AvatarSection`,
ITEM-045) qui uploade vers le stockage S3-compatible plutôt que d'exiger une URL.

Constat additionnel (audit du code) : `organization.logo` n'est aujourd'hui affiché
**nulle part** dans l'interface (`OrgSwitcher` montre une icône générique `Box`, pas
le logo) — sans corriger ce point, la fonctionnalité resterait invisible et donc
impossible à vérifier visuellement. Un critère minimal d'affichage est donc inclus
ci-dessous plutôt que traité comme un item séparé, pour que le résultat soit
constatable.

## User story
En tant qu'admin d'une organisation, je veux téléverser directement un fichier image
pour le logo de mon organisation (aux réglages ou pendant l'inscription), plutôt que
de devoir héberger l'image moi-même et en coller l'URL.

## Critères d'acceptation
- [x] `Organization` gagne un champ de stockage (ex. `logoStorageKey String?`,
      parallèle à `User.avatarStorageKey`) et une route qui redirige vers une URL
      signée temporaire (même principe que `GET /api/profile/avatar`, ITEM-045) —
      jamais de bucket public.
- [x] `BrandingForm.tsx` : le champ « Logo (URL, optionnel) » est remplacé par un
      sélecteur de fichier (bouton + `input[type=file]` caché, JPEG/PNG/WebP) qui
      téléverse directement l'image choisie — plus de saisie d'URL manuelle.
- [x] `OnboardingWizard.tsx` (étape 1, Organisation) : même remplacement — sélection
      de fichier au lieu du champ URL, avec le même résultat final (organisation
      créée avec son logo, si fourni).
- [x] Un logo déjà défini peut être retiré (bouton dédié) — supprime le fichier du
      stockage et remet l'organisation sans logo, sans dupliquer de fichiers orphelins
      à chaque remplacement.
- [x] Le logo de l'organisation active est affiché dans `OrgSwitcher` (remplace
      l'icône générique `Box` quand un logo est défini) — seul point d'affichage
      actuellement identifié dans le code, condition minimale pour que la
      fonctionnalité soit visible et vérifiable.

## Notes techniques
Réutiliser directement l'infrastructure de stockage déjà en place (`lib/storage.ts` —
`uploadFile`/`deleteFile`/`getSignedUrl`, ITEM-027) et le même schéma que
`AvatarSection.tsx`/`app/api/profile/avatar/route.ts` (ITEM-045) : bouton déclenchant
un `input[type=file]` caché, upload en `FormData` vers une nouvelle route (ex.
`app/api/organizations/[id]/logo/route.ts`, `POST` pour uploader/remplacer, `GET`
pour rediriger vers l'URL signée), limite de taille et types acceptés cohérents avec
l'avatar (5 Mo, JPEG/PNG/WebP), sauf raison contraire trouvée à l'implémentation.

**Pas de recadrage circulaire comme l'avatar** (`react-easy-crop`, `cropShape="round"`)
: un logo d'organisation n'est pas nécessairement carré (bannière large, logo
horizontal...) — upload direct du fichier choisi, sans étape de recadrage. Garder le
composant plus simple que `AvatarSection`.

**Particularité de l'étape « Organisation » de l'assistant d'inscription (ITEM-073)** :
contrairement au profil utilisateur (déjà existant au moment de l'upload d'avatar),
l'organisation n'existe pas encore avant la soumission du formulaire de cette étape.
L'upload du logo doit donc se faire en deux temps : (1) soumission du nom → création
de l'organisation (`createOnboardingOrganizationAction`, inchangé pour le nom), (2)
upload du fichier logo vers la nouvelle route une fois l'id de l'organisation connu
— pas un envoi atomique en un seul appel comme c'était le cas avec le champ URL.
Prévoir un état intermédiaire dans `OnboardingWizard` (organisation créée, logo
optionnel à uploader avant de continuer, ou uploadable juste après avec possibilité
de continuer sans).

`organization.logo` (`String?`) continue de stocker une URL — désormais toujours celle
de la nouvelle route interne (`/api/organizations/[id]/logo`), jamais saisie par
l'utilisateur — cohérent avec `User.image` qui pointe déjà vers `/api/profile/avatar`
plutôt que vers S3 directement (ITEM-045). Aucun changement nécessaire dans
`lib/organization.ts`/`CurrentOrganization` : le champ garde le même type et la même
sémantique de lecture, seule sa source d'écriture change.

Décisions à l'implémentation :
- **Route `app/api/organizations/[id]/logo/route.ts`** (nouveau) : `GET` accessible à
  tout membre actif (afficher le logo de son organisation ne demande pas de droit
  particulier) ; `POST`/`DELETE` réservés owner/admin (même règle que
  `updateBrandingAction`). `POST` supprime l'ancien fichier du stockage après avoir
  écrit le nouveau (pas de fichiers orphelins à chaque remplacement, même principe
  que l'avatar) ; `DELETE` idempotent (aucune erreur si aucun logo n'était défini).
- **`OnboardingWizard.tsx` restructuré** : l'étape « Organisation » n'utilise plus
  `useActionState` (formulaire à soumission unique) mais un gestionnaire manuel
  (`useTransition`) qui enchaîne deux appels : `createOnboardingOrganizationAction`
  (nom → création de l'organisation, retourne désormais `organizationId`) puis, si un
  fichier a été choisi, `POST /api/organizations/{organizationId}/logo`. Un échec de
  l'upload du logo n'empêche pas de continuer (le logo est optionnel) — message
  d'erreur non bloquant invitant à réessayer depuis les réglages.
- **`createOnboardingOrganizationAction`** (`app/onboarding/actions.ts`) : ne prend
  plus `logo` en entrée (retiré de `onboardingOrganizationSchema`) ; retourne
  `organizationId` sur succès, y compris dans la branche idempotente (organisation
  déjà existante) — nécessaire pour le nouvel enchaînement ci-dessus.
- **`brandingSchema`** (`lib/validators/organization.ts`) et `updateBrandingAction` :
  champ `logo` retiré — la mise à jour du logo passe entièrement par la nouvelle
  route, plus par ce formulaire.
- **`LogoUpload.tsx`** (nouveau, `components/tenant/`) : upload immédiat dès la
  sélection d'un fichier (pas de bouton « Enregistrer » séparé, cohérent avec
  `AvatarSection`), plus un bouton « Retirer » quand un logo existe déjà. Pas de
  recadrage (`react-easy-crop`) : un logo n'est pas nécessairement carré.
- **`OrgSwitcher.tsx`** : affiche `active.logo` (déjà présent dans
  `OrganizationSummary`, jamais lu jusqu'ici) via `<img>` à la place de l'icône
  générique `Box` quand un logo est défini.

Vérifications effectuées : `npx tsc --noEmit`, `npx eslint .` (aucune erreur — 1
avertissement préexistant sans rapport), `npx vitest run` (60 tests, inchangés —
aucune logique testable unitairement ajoutée, upload de fichier/route API). `npx
next build` OK (`/api/organizations/[id]/logo` listée).

Testé en conditions réelles : **découverte en testant que le serveur `next dev` déjà
en cours (actif depuis une session précédente) ne servait pas correctement la
nouvelle route** (500 sur un cas qui aurait dû renvoyer 404) — confirmé qu'il
s'agissait d'un état de développement obsolète (pas un bug de ce code) en relançant
l'application depuis un build de production propre (`next build` + `next start` sur
un port séparé, arrêté après coup, sans toucher au serveur `next dev` existant) : sur
cette instance propre, tous les cas se comportent correctement — 401 sans session,
404 organisation/logo introuvable, 415 type de fichier refusé, 200 suppression
idempotente sans logo existant, page de branding affichant le nouveau sélecteur,
étape 1 de l'assistant d'inscription affichant le même sélecteur pour un compte
fraîchement inscrit. Le stockage S3-compatible (MinIO) n'était pas démarré dans cet
environnement : l'upload réel d'un fichier valide échoue proprement (503, message
clair) plutôt que de planter — le chemin d'upload réussi (fichier réellement déposé,
`OrgSwitcher` affichant l'image) n'a donc pas pu être vérifié de bout en bout, à
confirmer par `backlog-test` avec MinIO/S3 disponible.

Fichiers : `prisma/schema.prisma` + migration
`20260718020000_add_organization_logo_storage_key`, nouveau
`app/api/organizations/[id]/logo/route.ts`, nouveau `components/tenant/LogoUpload.tsx`,
`components/tenant/BrandingForm.tsx`, `components/onboarding/OnboardingWizard.tsx`,
`app/onboarding/actions.ts`, `components/layout/OrgSwitcher.tsx`,
`lib/validators/organization.ts`,
`app/(protected)/settings/organizations/[id]/branding/actions.ts`.

## Captures attendues
Réglages de branding avec le sélecteur de fichier logo (avant/après upload, avec
MinIO/S3 disponible) ; étape « Organisation » de l'assistant d'inscription avec le
même sélecteur ; `OrgSwitcher` affichant le logo téléversé à la place de l'icône
générique ; retrait du logo ramenant l'icône par défaut.

## Journal
- 2026-07-18 (backlog) — créé à partir d'une capture d'écran demandant de remplacer
  le champ URL du logo par un vrai sélecteur de fichier (upload), sur le modèle déjà
  en place pour l'avatar utilisateur (ITEM-045). Inclut un critère d'affichage dans
  `OrgSwitcher` (actuellement aucun affichage du logo nulle part dans l'app), sans
  quoi la fonctionnalité resterait invérifiable visuellement.
- 2026-07-18 (implement) — démarrage
- 2026-07-18 (implement) — implémenté : `Organization.logoStorageKey` + route
  `app/api/organizations/[id]/logo` (GET/POST/DELETE, signée temporaire, jamais de
  bucket public), champ URL remplacé par un vrai sélecteur de fichier dans
  `BrandingForm`/`OnboardingWizard`, logo affiché dans `OrgSwitcher`. Fichiers listés
  en Notes techniques.
