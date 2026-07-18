---
id: ITEM-046
title: Paramètres de sécurité (2FA, sessions actives)
status: implemented
priority: P2
type: feature
estimate: M
depends_on: [ITEM-045]
created: 2026-07-16
updated: 2026-07-16
---

## Idée / contexte
La sécurité du compte au-delà du mot de passe (ITEM-045) — double authentification et
visibilité sur les sessions actives — est attendue sur un SaaS Core sérieux.

## User story
En tant qu'utilisateur, je veux activer la double authentification et voir mes sessions
actives, afin de sécuriser mon compte.

## Critères d'acceptation
- [x] Section « Sécurité » dans `/settings` permet d'activer/désactiver la 2FA (TOTP)
      via le plugin Better Auth correspondant.
- [x] Liste des sessions actives (appareil, IP, dernière activité) avec possibilité de
      révoquer une session à distance.
- [x] La révocation d'une session déconnecte immédiatement l'appareil concerné.

## Notes techniques
Better Auth propose un plugin `twoFactor` officiel à intégrer plutôt que réimplémenter
TOTP à la main.
Fichiers : `lib/auth.ts`, `app/(protected)/settings/security/page.tsx`.

Décisions à l'implémentation :
- **Plugin officiel** `twoFactor` (`better-auth/plugins`) côté serveur (`lib/auth.ts`,
  `issuer: "SaaS Core"`) et `twoFactorClient` (`better-auth/client/plugins`) côté
  client — aucune réimplémentation TOTP maison. Schéma imposé par le plugin :
  `User.twoFactorEnabled` (additional field) + table `TwoFactor` (secret, backupCodes,
  verified, failedVerificationCount, lockedUntil) — noms de champs exacts vérifiés dans
  les sources du plugin avant d'écrire la migration.
- **« Section Sécurité dans /settings »** : implémentée comme sous-route
  `/settings/security` (fichier explicitement listé dans les notes techniques) plutôt
  que dans la page `/settings` elle-même, avec une carte de lien « Sécurité » ajoutée en
  haut de `/settings` — évite d'alourdir la page de préférences de notification
  (ITEM-038) déjà en place.
- **Connexion avec 2FA activée** : `authClient.signIn.email()` ne crée plus de session
  directement, il renvoie `{ twoFactorRedirect: true, twoFactorMethods }` (le plugin
  modifie la réponse de `/sign-in/email` par un hook plutôt que via son propre
  endpoint — le type client de base ne l'expose pas, d'où la vérification par `in`
  plutôt qu'un accès direct dans `LoginForm.tsx`). Nouvelle route `/two-factor`
  (`TwoFactorVerifyForm.tsx`) qui valide le code via `authClient.twoFactor.verifyTotp`
  — avec un accès par code de secours (`verifyBackupCode`) en repli, puisque des codes
  de secours sont générés à l'activation et doivent rester utilisables. Extraction du
  garde-fou anti-open-redirect `safeCallbackUrl` (déjà présent dans `login/page.tsx`)
  vers `lib/utils.ts`, réutilisé par les deux pages plutôt que dupliqué.
- **QR code** : `react-qr-code` (nouvelle dépendance légère, rendu SVG pur, aucune
  dépendance canvas) — le `totpURI` renvoyé par `authClient.twoFactor.enable()` est
  rendu tel quel, aucune génération d'image côté serveur.
- **Sessions actives** : `authClient.listSessions()`/`revokeSession()`/
  `revokeOtherSessions()` sont des méthodes de base de Better Auth (pas de plugin) —
  aucune route API custom nécessaire. La session courante est identifiée en comparant
  le `token` de chaque entrée à celui de `authClient.useSession()`. « Dernière
  activité » utilise `Session.updatedAt` (meilleur proxy disponible — Better Auth ne
  fournit pas de champ dédié).
- Vérifié en dev de bout en bout via l'API Better Auth directement (secret TOTP réel +
  code calculé manuellement en Python, algorithme RFC 6238) : activation (`enable` →
  `verifyTotp` → `twoFactorEnabled: true` en base), connexion suivante correctement
  bloquée (`twoFactorRedirect: true`, aucune session créée), validation du challenge
  avec un nouveau code TOTP → session réelle créée, `listSessions()` renvoie bien
  toutes les sessions actives, révocation d'une session tierce depuis une autre session
  → la session révoquée est immédiatement rejetée (`get-session` renvoie `null` sur son
  cookie dès la requête suivante, critère 3 confirmé), puis désactivation de la 2FA et
  nettoyage complet des données de test.

## Captures attendues
QR code d'activation 2FA scanné et validé ; liste de sessions avec révocation d'une
session distante. Le flux complet a été vérifié fonctionnellement en dev via l'API
directe (voir Notes techniques) ; une capture d'écran réelle nécessite de scanner le QR
avec une application d'authentification (TOTP calculé manuellement pour les tests ici).

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-16 (implement) — démarrage
- 2026-07-16 (implement) — implémenté : plugin Better Auth `twoFactor` (serveur +
  client), modèle `TwoFactor` + `User.twoFactorEnabled` + migration, flux de connexion
  2FA (`LoginForm.tsx`, page `/two-factor`), page `/settings/security`
  (`TwoFactorSection.tsx`, `SessionsSection.tsx`) + lien depuis `/settings`,
  `safeCallbackUrl` extrait vers `lib/utils.ts`. Fichiers : `prisma/schema.prisma`,
  `prisma/migrations/20260716210000_add_two_factor/`, `lib/auth.ts`,
  `lib/auth-client.ts`, `lib/utils.ts`, `app/(auth)/login/LoginForm.tsx`,
  `app/(auth)/login/page.tsx`, `app/(auth)/two-factor/page.tsx`,
  `app/(auth)/two-factor/TwoFactorVerifyForm.tsx`,
  `app/(protected)/settings/page.tsx`, `app/(protected)/settings/security/page.tsx`,
  `components/settings/TwoFactorSection.tsx`, `components/settings/SessionsSection.tsx`.
  `tsc --noEmit`, `eslint` et `next build` passent ; migration appliquée ; vérifié
  fonctionnellement en dev de bout en bout avec un vrai secret TOTP (activation,
  connexion bloquée puis validée par code, liste de sessions, révocation à distance
  avec déconnexion immédiate confirmée, désactivation, nettoyage).
