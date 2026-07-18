---
id: ITEM-004
title: Réinitialisation du mot de passe (demande + nouveau mot de passe)
status: implemented
priority: P1
type: feature
estimate: M
depends_on: [ITEM-001, ITEM-005]
created: 2026-07-04
updated: 2026-07-15
---

## Idée / contexte
Un utilisateur qui a oublié son mot de passe doit pouvoir le réinitialiser via un
lien envoyé par e-mail. Flux en deux étapes : demande (saisie e-mail) puis
définition d'un nouveau mot de passe via un token.

## User story
En tant qu'utilisateur, je veux réinitialiser mon mot de passe via un lien reçu par
e-mail, afin de récupérer l'accès à mon compte.

## Critères d'acceptation
- [x] Route `/forgot-password` : formulaire e-mail qui déclenche l'envoi d'un lien de réinitialisation.
- [x] Message neutre affiché quelle que soit l'existence de l'e-mail (pas de divulgation).
- [x] L'e-mail de réinitialisation est envoyé via Resend (ITEM-005) avec un lien tokenisé.
- [x] Route `/reset-password` : lit le token, propose nouveau mot de passe + confirmation.
- [x] Token invalide ou expiré → message d'erreur clair, pas de changement effectué.
- [x] Après succès, le mot de passe est mis à jour et l'utilisateur peut se connecter avec le nouveau ; redirection vers `/login`.

## Notes techniques
- Fichiers : `app/(auth)/forgot-password/page.tsx`, `app/(auth)/reset-password/page.tsx`.
- Utiliser la fonctionnalité `forgetPassword` / `resetPassword` de Better Auth avec callback d'envoi d'e-mail branché sur Resend.
- Vérifier l'expiration du token et l'usage unique.

### Décisions prises à l'implémentation
- Better Auth (cette version) n'expose pas de méthode `forgetPassword` : le endpoint serveur est `/request-password-reset` et le client dynamique correspondant est `authClient.requestPasswordReset({ email, redirectTo })`. `authClient.resetPassword({ newPassword, token })` reste inchangé.
- `lib/auth.ts` : ajout de `emailAndPassword.sendResetPassword({ user, url }) => sendPasswordResetEmail({ to: user.email, url })`, branché sur `lib/email.ts` (ITEM-005).
- Flux du lien : `requestPasswordReset({ redirectTo: "/reset-password" })` → Better Auth génère `GET /api/auth/reset-password/:token?callbackURL=/reset-password` (envoyé par e-mail) → si le token est valide, redirige vers `/reset-password?token=...` ; sinon vers `/reset-password?error=INVALID_TOKEN`. La page `/reset-password` gère les deux cas (formulaire si token présent et pas d'erreur, message "lien invalide" avec renvoi vers `/forgot-password` sinon).
- Expiration et usage unique gérés nativement par Better Auth (`consumeVerificationValue`, TTL 1h par défaut) — pas de logique custom nécessaire, seulement vérifiée.
- Page `/forgot-password` : réponse toujours neutre côté UI, sans inspecter le résultat de l'appel (Better Auth renvoie déjà le même message générique que l'e-mail existe ou non côté serveur).
- `/reset-password` : `useSearchParams` nécessite un composant client + `Suspense` pour éviter les erreurs de build Next.js — page découpée en `ResetPasswordPage` (wrapper + Suspense) et `ResetPasswordForm` (logique).
- Vérifié en conditions réelles (curl + lecture directe de la table `verification` pour récupérer le token, RESEND_API_KEY absente donc lien dev en base) : requête neutre identique pour e-mail existant/inexistant, redirection `GET /api/auth/reset-password/:token` → `/reset-password?token=...`, token bogus/rejoué → `INVALID_TOKEN`, mot de passe faible → `PASSWORD_TOO_SHORT`, reset réussi → ancien mot de passe rejeté, nouveau accepté avec session. `tsc --noEmit`, lint et `pnpm build` OK.

## Captures attendues
Formulaire de demande ; e-mail/lien généré (ou log en dev) ; page de nouveau mot de passe ; confirmation + login réussi avec le nouveau mot de passe.

## Journal
- 2026-07-04 (backlog) — créé
- 2026-07-15 (implement) — démarrage. Dépendance ITEM-005 (Resend) implémentée au préalable dans cette même session.
- 2026-07-15 (implement) — implémenté : flux complet demande + reset de mot de passe (`/forgot-password`, `/reset-password`), branché sur Better Auth (`requestPasswordReset`/`resetPassword`) et `lib/email.ts` (ITEM-005). Messages neutres (pas de user enumeration), gestion token invalide/expiré/rejoué, redirection `/login` après succès. Fichiers : app/(auth)/forgot-password/page.tsx, app/(auth)/reset-password/page.tsx, lib/auth.ts. Vérifié en conditions réelles via l'API et la base (cycle complet demande → token → reset → login avec nouveau mot de passe, rejeu de token rejeté) + tsc/lint/build.
