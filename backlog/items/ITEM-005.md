---
id: ITEM-005
title: Intégrer l'envoi d'e-mails transactionnels (Resend)
status: verified
priority: P1
type: feature
estimate: S
depends_on: [ITEM-001]
created: 2026-07-04
updated: 2026-07-04
---

## Idée / contexte
La réinitialisation de mot de passe (ITEM-004) et les invitations (ITEM-008)
nécessitent l'envoi d'e-mails. On centralise l'intégration Resend dans un service
réutilisable pour éviter la duplication.

## User story
En tant que développeur, je veux un service d'envoi d'e-mails réutilisable,
afin que les flux d'auth (reset, invitation) envoient des e-mails fiables et testables.

## Critères d'acceptation
- [x] SDK Resend installé et configuré via `RESEND_API_KEY` (documentée dans `.env` / README).
- [x] Un module `lib/email.ts` expose une fonction générique `sendEmail({ to, subject, ... })`.
- [x] Au moins deux templates : « réinitialisation de mot de passe » et « invitation ».
- [x] Adresse d'expéditeur configurable via env (`EMAIL_FROM`).
- [x] Mode dev : si la clé API est absente, le lien/e-mail est loggé en console au lieu d'échouer (fallback dev).
- [x] Une erreur d'envoi est capturée et journalisée sans crasher le flux appelant.

## Notes techniques
- Fichiers : `lib/email.ts`, templates (React Email optionnel ou HTML simple).
- Fournir des fonctions dédiées `sendPasswordResetEmail(...)` et `sendInvitationEmail(...)` construites au-dessus de `sendEmail`.
- Hors-périmètre : e-mails marketing / newsletters.

### Décisions d'implémentation
- SDK : `resend@6.17.1` (ajouté via pnpm).
- `lib/email.ts` : client Resend instancié uniquement si `RESEND_API_KEY` est présent (sinon `null` → fallback dev). `sendEmail({ to, subject, html, text? })` **ne throw jamais** : retourne `{ ok: true, id }` ou `{ ok: false, error }`, erreurs Resond + exceptions réseau capturées et loggées (`console.error`).
- Fallback dev : sans clé API, `sendEmail` logge le destinataire/expéditeur/sujet/texte (donc le lien) via `console.info` et retourne `{ ok: true, id: null }`.
- Helpers dédiés au-dessus de `sendEmail` : `sendPasswordResetEmail({ to, url, userName? })` et `sendInvitationEmail({ to, url, inviterName? })`, avec templates HTML (shell `layout()` + `button()`) et fallback texte.
- Expéditeur : `EMAIL_FROM` (défaut `onboarding@resend.dev`).
- Env documentées dans `.env` et `README.md` (`RESEND_API_KEY`, `EMAIL_FROM`).
- Interface pensée pour ITEM-004 (branchement du callback Better Auth `sendResetPassword` sur `sendPasswordResetEmail`) et ITEM-008 (invitations).

## Captures attendues
Log console du fallback dev montrant le lien ; ou e-mail reçu dans la boîte de test Resend.

## Journal
- 2026-07-04 (backlog) — créé
- 2026-07-04 (implement) — démarrage (débloque ITEM-004)
- 2026-07-04 (implement) — implémenté : service Resend `lib/email.ts` (`sendEmail` générique sans throw, fallback dev console, capture d'erreur) + helpers `sendPasswordResetEmail`/`sendInvitationEmail` avec templates HTML, expéditeur `EMAIL_FROM`, env documentées. Sanity : tsc OK, lint OK, build OK. Fichiers : lib/email.ts, .env, README.md, package.json.
- 2026-07-04 (verify) — vérifié : revue code OK (6/6 critères tracés), tsc OK, lint OK, build OK. Secrets non exposés (non-NEXT_PUBLIC), `sendEmail` sans throw, fallback dev logge le lien. Nit non bloquant : grammaire du template invitation sans `inviterName` (« Vous a invité… ») — à peaufiner dans ITEM-008.
