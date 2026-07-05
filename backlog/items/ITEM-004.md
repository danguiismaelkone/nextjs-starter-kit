---
id: ITEM-004
title: Réinitialisation du mot de passe (demande + nouveau mot de passe)
status: verified
priority: P1
type: feature
estimate: M
depends_on: [ITEM-001, ITEM-005]
created: 2026-07-04
updated: 2026-07-04
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

### Décisions d'implémentation
- **Config serveur** (`lib/auth.ts`) : `emailAndPassword.sendResetPassword` branché sur `sendPasswordResetEmail` (ITEM-005) ; `resetPasswordTokenExpiresIn = 3600` (1 h). Better Auth invalide le token après usage (usage unique) et vérifie l'expiration côté serveur.
- **Client** (`lib/auth-client.ts`) : export de `requestPasswordReset` et `resetPassword`.
- **Flux Better Auth** : `requestPasswordReset({ email, redirectTo: "/reset-password" })` → e-mail avec lien `…/api/auth/reset-password/<token>?callbackURL=/reset-password`. Le clic passe par le handler qui valide le token puis redirige vers `/reset-password?token=<token>` (ou `?error=INVALID_TOKEN` si invalide/expiré).
- **`/forgot-password`** (`app/(auth)/forgot-password/page.tsx` + `components/auth/forgot-password-form.tsx`) : formulaire e-mail ; **message neutre systématique** après soumission (le serveur renvoie déjà une réponse neutre pour un e-mail inconnu — pas d'énumération). Redirige les sessions actives vers `/dashboard`.
- **`/reset-password`** (`app/(auth)/reset-password/page.tsx` + `components/auth/reset-password-form.tsx`) : la page (Server Component) lit `token`/`error` des searchParams ; si `error` ou pas de `token` → écran « Lien invalide » (aucun changement) + lien pour redemander. Sinon formulaire (nouveau mdp + confirmation, validation ≥ 8 + correspondance) → `resetPassword({ newPassword, token })` ; erreur (token expiré au submit) affichée sans changement ; succès → redirection `/login`.
- En dev sans `RESEND_API_KEY`, le lien tokenisé est visible dans le log console (fallback ITEM-005).

## Captures attendues
Formulaire `/forgot-password` ; message neutre après soumission ; log console du lien tokenisé (fallback dev) ; page `/reset-password` (nouveau mdp + confirmation) ; écran « Lien invalide » pour token erroné/expiré ; login réussi avec le nouveau mot de passe après redirection `/login`.

## Journal
- 2026-07-04 (backlog) — créé
- 2026-07-04 (implement) — démarrage (dépendances ITEM-001 verified, ITEM-005 implemented — OK)
- 2026-07-04 (implement) — implémenté : flux reset complet — callback `sendResetPassword` (via Resend ITEM-005) + TTL token 1 h dans `lib/auth.ts`, exports client `requestPasswordReset`/`resetPassword`, page/formulaire `/forgot-password` (message neutre anti-énumération), page/formulaire `/reset-password` (lecture token, écran « Lien invalide », validation, redirection `/login`). Sanity : tsc OK, lint OK, build OK (routes `/forgot-password` + `/reset-password`). Fichiers : lib/auth.ts, lib/auth-client.ts, app/(auth)/forgot-password/page.tsx, app/(auth)/reset-password/page.tsx, components/auth/forgot-password-form.tsx, components/auth/reset-password-form.tsx.
- 2026-07-04 (verify) — vérifié : revue code OK (6/6 critères tracés), tsc OK, lint OK, build OK (routes `/forgot-password` + `/reset-password`). Anti-énumération serveur + UI, TTL token 1 h + usage unique (Better Auth), écran « Lien invalide » sans changement, redirection `/login` au succès.
