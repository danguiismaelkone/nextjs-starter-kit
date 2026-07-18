---
id: ITEM-084
title: Fusionner 2FA et Sessions actives dans /profile (retirer /settings/security comme page séparée)
status: implemented
priority: P2
type: chore
estimate: M
depends_on: [ITEM-046, ITEM-082, ITEM-083]
created: 2026-07-18
updated: 2026-07-18
---

## Idée / contexte
Décision utilisateur (question posée pendant le cadrage de cet item) : plutôt
que de laisser 2FA/Sessions sur leur page actuelle `/settings/security`, on les
rapatrie sur `/profile` pour correspondre à la capture de référence — une
seule page « Informations personnelles » regroupant compte, sécurité et
sessions, comme un SaaS tiers.

`/settings/security` (`app/(protected)/settings/security/page.tsx`, ITEM-046)
affiche déjà `TwoFactorSection` (TOTP + codes de secours) et `SessionsSection`
(liste des sessions : type d'appareil déduit du user-agent, IP, dernière
activité, badge « Cet appareil », révocation individuelle). Ces deux
composants sont fonctionnels et testés — cet item les **déplace**, il ne les
réécrit pas.

Éléments de la capture volontairement **absents** de ce projet, à ne pas
inventer : colonne « Lieu » (aucune géolocalisation stockée — `Session` ne
contient que `ipAddress`/`userAgent`), bouton « Se déconnecter de toutes les
autres sessions » (seule la révocation individuelle existe aujourd'hui —
pourrait faire l'objet d'un item séparé si souhaité, hors périmètre ici),
Clés d'accès/WebAuthn (n'existe pas).

## User story
En tant qu'utilisateur, je veux gérer mon authentification à deux facteurs et
mes sessions actives directement depuis `/profile`, sans naviguer vers une
page séparée, comme sur la page de référence.

## Critères d'acceptation
- [x] `/profile` affiche une section « Authentification à deux facteurs »
      (composant `TwoFactorSection` existant, déplacé) — activer/désactiver le
      2FA (TOTP) fonctionne à l'identique qu'aujourd'hui.
- [x] `/profile` affiche une section « Sessions » (composant `SessionsSection`
      existant, déplacé) — liste des sessions actives, badge session courante,
      révocation individuelle fonctionnent à l'identique qu'aujourd'hui.
- [x] `/settings/security` ne 404 pas et ne laisse pas de lien mort : soit
      redirigé vers `/profile`, soit supprimé et tout lien interne restant vers
      `/settings/security` mis à jour vers `/profile`.
- [x] La carte « Sécurité » du hub `/settings` (ITEM-082,
      `app/(protected)/settings/page.tsx`) pointe vers `/profile` (plus vers
      `/settings/security`).
- [x] Aucune section n'est ajoutée pour des éléments absents de ce projet
      (pas de colonne « Lieu », pas de bouton « déconnecter toutes les autres
      sessions », pas de Clés d'accès).
- [x] Aucune régression sur le comportement du 2FA/sessions (mêmes actions
      serveur, mêmes gardes de session).

## Notes techniques
Fichiers concernés : `app/(protected)/profile/page.tsx` (ajouter les deux
sections), `app/(protected)/settings/security/page.tsx` (transformer en
redirect vers `/profile`, ou supprimer — vérifier d'abord qu'aucun autre lien
interne ni test e2e ne cible `/settings/security` en dur avant de supprimer),
`app/(protected)/settings/page.tsx` (mettre à jour l'`href` de la carte
Sécurité), `components/settings/TwoFactorSection.tsx` et
`components/settings/SessionsSection.tsx` (déplacer vers `components/profile/`
si on veut aligner le dossier sur la nouvelle page qui les utilise — sinon les
laisser dans `components/settings/` et les importer depuis `/profile`, au
choix de l'implémentation, cela n'affecte aucun critère).

Dépend d'ITEM-083 (regroupement Nom/Mot de passe/E-mail/Téléphone) pour éviter
de réorganiser deux fois la même page — à faire après, pas en parallèle.

Pas de module FATIHOUNE dédié.

Décisions à l'implémentation :
- **`TwoFactorSection`/`SessionsSection` laissés dans `components/settings/`**
  (pas déplacés vers `components/profile/`) — chaque composant reste
  autonome avec sa propre `Card`, importé tel quel depuis `/profile` ; aucun
  changement de logique, seul le point d'import change.
- **`/settings/security` transformé en redirect** (`redirect("/profile")`)
  plutôt que supprimé — aucun autre lien interne ni test e2e ne le ciblait
  (vérifié par grep), mais un favori/lien externe existant continue de
  fonctionner au lieu de 404.
- **Hub `/settings` (ITEM-082)** : la carte « Sécurité » pointe désormais vers
  `/profile` (même page que la carte « Informations personnelles » du même
  hub) — les deux cartes restent distinctes (icône/description différentes,
  cohérent avec la scission conceptuelle Utilisateur/Sécurité de la page
  elle-même), non fusionnées en une seule carte : hors périmètre de cet item.

Fichiers modifiés : `app/(protected)/profile/page.tsx`,
`app/(protected)/settings/security/page.tsx` (redirect),
`app/(protected)/settings/page.tsx` (href de la carte Sécurité).
`npx tsc --noEmit` et `npx eslint` (fichiers touchés) OK.

## Captures attendues
`/profile` après fusion : sections Utilisateur (ITEM-083), Authentification à
deux facteurs et Sessions toutes visibles sur la même page. `/settings` (hub) :
la carte Sécurité pointant vers `/profile`. `/settings/security` : redirection
vers `/profile` (ou 404 attendu si supprimé et documenté comme tel).

## Journal
- 2026-07-18 (backlog) — créé suite à la décision utilisateur de fusionner
  2FA/Sessions (existants sur `/settings/security`) dans `/profile` plutôt que
  de les y laisser, pour coller à la capture de référence (une seule page
  « Informations personnelles »).
- 2026-07-18 (implement) — démarrage
- 2026-07-18 (implement) — implémenté : `TwoFactorSection`/`SessionsSection`
  ajoutés à `/profile` (import direct, composants inchangés) ;
  `/settings/security` redirige vers `/profile` ; carte « Sécurité » du hub
  `/settings` pointant vers `/profile`. Fichiers :
  `app/(protected)/profile/page.tsx`,
  `app/(protected)/settings/security/page.tsx`,
  `app/(protected)/settings/page.tsx`.
