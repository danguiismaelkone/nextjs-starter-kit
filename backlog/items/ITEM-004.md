---
id: ITEM-004
title: Réinitialisation du mot de passe (demande + nouveau mot de passe)
status: todo
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
- [ ] Route `/forgot-password` : formulaire e-mail qui déclenche l'envoi d'un lien de réinitialisation.
- [ ] Message neutre affiché quelle que soit l'existence de l'e-mail (pas de divulgation).
- [ ] L'e-mail de réinitialisation est envoyé via Resend (ITEM-005) avec un lien tokenisé.
- [ ] Route `/reset-password` : lit le token, propose nouveau mot de passe + confirmation.
- [ ] Token invalide ou expiré → message d'erreur clair, pas de changement effectué.
- [ ] Après succès, le mot de passe est mis à jour et l'utilisateur peut se connecter avec le nouveau ; redirection vers `/login`.

## Notes techniques
- Fichiers : `app/(auth)/forgot-password/page.tsx`, `app/(auth)/reset-password/page.tsx`.
- Utiliser la fonctionnalité `forgetPassword` / `resetPassword` de Better Auth avec callback d'envoi d'e-mail branché sur Resend.
- Vérifier l'expiration du token et l'usage unique.

## Captures attendues
Formulaire de demande ; e-mail/lien généré (ou log en dev) ; page de nouveau mot de passe ; confirmation + login réussi avec le nouveau mot de passe.

## Journal
- 2026-07-04 (backlog) — créé
