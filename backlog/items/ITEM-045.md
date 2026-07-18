---
id: ITEM-045
title: Page profil utilisateur (infos, avatar, mot de passe)
status: implemented
priority: P1
type: feature
estimate: M
depends_on: [ITEM-001]
created: 2026-07-16
updated: 2026-07-16
---

## Idée / contexte
`NavUser.tsx` (ITEM-009) contient déjà des liens « Mon profil » / « Paramètres » qui ne
pointent vers aucune page réelle. Il faut construire ces pages.

## User story
En tant qu'utilisateur, je veux modifier mes informations personnelles, mon avatar et
mon mot de passe, afin de garder mon profil à jour.

## Critères d'acceptation
- [x] Page `/profile` avec formulaire infos (nom, téléphone, bio) et upload d'avatar
      avec recadrage.
- [x] Formulaire de changement de mot de passe (ancien + nouveau + confirmation)
      réutilisant la logique Better Auth existante.
- [x] Les liens « Mon profil » / « Paramètres » déjà présents dans `NavUser.tsx`
      pointent vers ces pages réelles au lieu de routes non implémentées.

## Notes techniques
Module `user-profile` (`ProfileForm.tsx`, `AvatarSection.tsx`,
`ChangePasswordForm.tsx`) directement réutilisable ; dépend du module `upload`
(ITEM-027/ITEM-028) pour l'avatar.
Fichiers : `app/(protected)/profile/page.tsx`, `components/profile/*`.

Décisions à l'implémentation :
- `phone`/`bio` ajoutés comme **additional fields Better Auth** (`lib/auth.ts`,
  `input: true`) plutôt que gérés hors de Better Auth — `ProfileForm.tsx` utilise
  `authClient.updateUser({ name, phone, bio })` directement (aucune route API
  custom nécessaire pour ces champs), avec l'inférence de types déjà en place via
  `inferAdditionalFields<typeof auth>()` (`lib/auth-client.ts`). `ChangePasswordForm.tsx`
  utilise `authClient.changePassword({ currentPassword, newPassword,
  revokeOtherSessions: false })` — la « logique Better Auth existante » demandée par
  le critère 2, avec le même mapping de codes d'erreur (`INVALID_PASSWORD`,
  `PASSWORD_TOO_SHORT`) que `AcceptInvitationForm.tsx`.
- **Avatar** : nouveau champ `User.avatarStorageKey` (clé S3 privée), distinct de
  `User.image` qui pointe toujours vers `/api/profile/avatar` — une route dédiée qui
  redirige (302) vers une URL signée fraîche à chaque appel, jamais de bucket public
  ni d'URL S3 stockée en dur (même principe que les documents, ITEM-027). L'ancien
  fichier est supprimé du stockage (best-effort) après upload du nouveau, pour éviter
  d'accumuler des objets orphelins.
- **Recadrage** : `react-easy-crop` (nouvelle dépendance légère, sans dépendance
  transitive lourde) — cadrage circulaire 1:1 avec zoom, extraction canvas côté
  client en JPEG avant l'upload (aucune bibliothèque de traitement d'image côté
  serveur nécessaire).
- Critère 3 déjà à moitié acquis avant cet item : `NavUser.tsx` pointait déjà vers
  `/profile` et `/settings` (`/settings` créé par ITEM-038) — aucune modification de
  `NavUser.tsx` nécessaire, seule la création de la page `/profile` manquait.
- **Bug trouvé et corrigé en testant** : `POST /api/profile/avatar` laissait
  `uploadFile()`/`getSignedUrl()` sans `try/catch`, produisant un 500 brut à corps
  vide si le stockage est inaccessible (incohérent avec le reste de l'app). Corrigé
  avec le même pattern que les routes IA (ITEM-042/043) : message non vide,
  `console.error` côté serveur, et aucune écriture DB partielle en cas d'échec de
  l'upload S3 (vérifié : la clé n'est enregistrée qu'après un upload réussi).
- Vérifié en dev (session réelle) : page protégée par redirection, `authClient.updateUser`
  persiste bien `name`/`phone`/`bio` en base, `authClient.changePassword` avec un
  mauvais mot de passe actuel échoue proprement (`INVALID_PASSWORD`) et avec le bon
  mot de passe réussit — nouveau mot de passe vérifié fonctionnel puis remis à sa
  valeur d'origine ; upload d'avatar avec stockage indisponible → 503 propre sans
  écriture partielle (après correction du bug ci-dessus).

## Captures attendues
Page profil avec formulaire rempli, changement d'avatar et de mot de passe réussis.
Le changement de mot de passe et la mise à jour des infos ont été vérifiés
fonctionnellement de bout en bout en dev (voir Notes techniques). L'upload d'avatar
réel nécessite MinIO/S3 accessible — non disponible dans cet environnement ; le
chemin d'erreur (stockage indisponible) a été vérifié à la place.

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-16 (implement) — démarrage
- 2026-07-16 (implement) — implémenté : champs `User.phone`/`bio`/`avatarStorageKey` +
  migration, `phone`/`bio` enregistrés comme additional fields Better Auth
  (`lib/auth.ts`), route `app/api/profile/avatar/route.ts` (GET redirige vers URL
  signée, POST upload + nettoyage de l'ancien avatar), `AvatarSection.tsx` (upload +
  recadrage via `react-easy-crop`), `ProfileForm.tsx` (`authClient.updateUser`),
  `ChangePasswordForm.tsx` (`authClient.changePassword`), page
  `app/(protected)/profile/page.tsx`. Fichiers : `prisma/schema.prisma`,
  `prisma/migrations/20260716200000_add_user_profile_fields/`, `lib/auth.ts`,
  `app/api/profile/avatar/route.ts`, `app/(protected)/profile/page.tsx`,
  `components/profile/AvatarSection.tsx`, `components/profile/ProfileForm.tsx`,
  `components/profile/ChangePasswordForm.tsx`. `tsc --noEmit`, `eslint` et `next
  build` passent ; migration appliquée ; vérifié fonctionnellement en dev avec
  session réelle (mise à jour nom/téléphone/bio persistée, changement de mot de passe
  bout en bout avec rollback de test, garde d'auth) — un bug de gestion d'erreur sur
  l'upload d'avatar (500 brut si stockage indisponible) a été trouvé et corrigé
  pendant ces tests.
