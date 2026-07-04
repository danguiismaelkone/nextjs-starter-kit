---
id: ITEM-005
title: Intégrer l'envoi d'e-mails transactionnels (Resend)
status: todo
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
- [ ] SDK Resend installé et configuré via `RESEND_API_KEY` (documentée dans `.env` / README).
- [ ] Un module `lib/email.ts` expose une fonction générique `sendEmail({ to, subject, ... })`.
- [ ] Au moins deux templates : « réinitialisation de mot de passe » et « invitation ».
- [ ] Adresse d'expéditeur configurable via env (`EMAIL_FROM`).
- [ ] Mode dev : si la clé API est absente, le lien/e-mail est loggé en console au lieu d'échouer (fallback dev).
- [ ] Une erreur d'envoi est capturée et journalisée sans crasher le flux appelant.

## Notes techniques
- Fichiers : `lib/email.ts`, templates (React Email optionnel ou HTML simple).
- Fournir des fonctions dédiées `sendPasswordResetEmail(...)` et `sendInvitationEmail(...)` construites au-dessus de `sendEmail`.
- Hors-périmètre : e-mails marketing / newsletters.

## Captures attendues
Log console du fallback dev montrant le lien ; ou e-mail reçu dans la boîte de test Resend.

## Journal
- 2026-07-04 (backlog) — créé
