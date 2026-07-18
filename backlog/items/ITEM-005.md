---
id: ITEM-005
title: Intégrer l'envoi d'e-mails transactionnels (Resend)
status: implemented
priority: P1
type: feature
estimate: S
depends_on: [ITEM-001]
created: 2026-07-04
updated: 2026-07-15
---

## Idée / contexte
La réinitialisation de mot de passe (ITEM-004) et les invitations (ITEM-008)
nécessitent l'envoi d'e-mails. On centralise l'intégration Resend dans un service
réutilisable pour éviter la duplication.

## User story
En tant que développeur, je veux un service d'envoi d'e-mails réutilisable,
afin que les flux d'auth (reset, invitation) envoient des e-mails fiables et testables.

## Critères d'acceptation
- [x] SDK Resend installé et configuré via `RESEND_API_KEY` (documentée dans `.env` / `.env.example`).
- [x] Un module `lib/email.ts` expose une fonction générique `sendEmail({ to, subject, ... })`.
- [x] Au moins deux templates : « réinitialisation de mot de passe » et « invitation ».
- [x] Adresse d'expéditeur configurable via env (`EMAIL_FROM`).
- [x] Mode dev : si la clé API est absente, le lien/e-mail est loggé en console au lieu d'échouer (fallback dev).
- [x] Une erreur d'envoi est capturée et journalisée sans crasher le flux appelant.

## Notes techniques
- Fichiers : `lib/email.ts`, templates (React Email optionnel ou HTML simple).
- Fournir des fonctions dédiées `sendPasswordResetEmail(...)` et `sendInvitationEmail(...)` construites au-dessus de `sendEmail`.
- Hors-périmètre : e-mails marketing / newsletters.

### Décisions prises à l'implémentation
- Templates en HTML simple inline (pas de React Email) — cohérent avec "HTML simple" proposé en note, évite une dépendance supplémentaire pour 2 templates courts.
- `sendEmail` retourne `{ success: boolean; error?: string }` plutôt que de lever une exception : permet aux appelants (ITEM-004, ITEM-008) de gérer l'échec sans try/catch obligatoire, et respecte le critère "sans crasher le flux appelant".
- Client Resend instancié paresseusement (`getResendClient()`) à chaque appel plutôt qu'au niveau module : si `RESEND_API_KEY` est absente, on bascule sur le fallback dev (log console) au lieu de faire planter l'import du module.
- `EMAIL_FROM` par défaut : `onboarding@resend.dev` (domaine sandbox Resend, utilisable sans domaine vérifié) si la variable n'est pas définie.
- Variables ajoutées à `.env.example` et `.env` (clé vide en local → fallback dev actif).
- Vérifié en conditions réelles (script Node avec `--env-file=.env`, sans `RESEND_API_KEY`) : `sendEmail` et `sendPasswordResetEmail` loguent bien le contenu en console et renvoient `{ success: true }`, sans appel réseau. `tsc --noEmit` et lint OK.

## Captures attendues
Log console du fallback dev montrant le lien ; ou e-mail reçu dans la boîte de test Resend.

## Journal
- 2026-07-04 (backlog) — créé
- 2026-07-15 (implement) — démarrage
- 2026-07-15 (implement) — implémenté : `lib/email.ts` (sendEmail générique + sendPasswordResetEmail + sendInvitationEmail), SDK Resend installé, fallback dev (log console) si `RESEND_API_KEY` absente, erreurs capturées sans crash. Fichiers : lib/email.ts, .env, .env.example, package.json (resend). Vérifié en conditions réelles (script Node, fallback dev confirmé) + tsc/lint.
