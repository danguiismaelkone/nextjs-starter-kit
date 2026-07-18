---
id: ITEM-040
title: Chat IA (assistant conversationnel)
status: implemented
priority: P2
type: feature
estimate: M
depends_on: [ITEM-039]
created: 2026-07-16
updated: 2026-07-16
---

## Idée / contexte
Premier cas d'usage IA visible : un assistant conversationnel générique intégré à
l'application, construit sur la fondation IA (ITEM-039).

## User story
En tant qu'utilisateur, je veux discuter avec un assistant IA intégré, afin d'obtenir
de l'aide contextuelle sans quitter l'application.

## Critères d'acceptation
- [x] Interface de chat (historique de messages, saisie, indicateur de frappe)
      accessible depuis le dashboard.
- [x] Les réponses sont streamées (affichage progressif) plutôt qu'attendues en bloc.
- [x] L'historique de conversation est conservé par utilisateur et consultable
      ultérieurement.

## Notes techniques
Le module `chat` FATIHOUNE cible une messagerie Socket.IO entre utilisateurs (hors
périmètre ici) — cet item est un chat IA à sens unique utilisateur↔assistant, à
construire sur `lib/ai.ts`.
Fichiers : `app/(protected)/ai/chat/page.tsx`, `components/ai/ChatPanel.tsx`.

Décisions à l'implémentation :
- **Un seul fil de discussion par utilisateur** (modèles `Conversation`/`ChatMessage`,
  préfixe `ai_*`), créé à la volée au premier message — pas de sélecteur/liste de
  conversations multiples (hors périmètre du critère « historique consultable »,
  suggérer un nouvel item si un jour souhaité).
- `lib/ai.ts` étendu avec `streamChat()` (variante streamée de `generateText`, expose
  directement le `MessageStream` du SDK Anthropic) et `logChatUsage()` — la
  journalisation ne peut pas se faire à l'intérieur de `streamChat()` sans consommer
  tout le flux d'abord, ce qui annulerait le streaming ; c'est donc l'appelant
  (`app/api/ai/chat/route.ts`) qui journalise une fois `stream.finalMessage()` résolu.
- `lib/ai-chat.ts` : couche de données pure (`getOrCreateConversation`,
  `listConversationMessages`, `appendMessage`), même séparation que
  `lib/notifications.ts`/`lib/ai.ts`.
- `app/api/ai/chat/route.ts` : `GET` renvoie l'historique ; `POST` streame la réponse en
  texte brut (`Content-Type: text/plain`, pas de SSE — plus simple à consommer côté
  client pour de l'affichage progressif). Le client IA est validé (tentative de
  `streamChat()`) **avant** toute écriture en base, pour ne jamais persister un message
  utilisateur orphelin si `ANTHROPIC_API_KEY` n'est pas configurée (503 immédiat,
  aucune ligne créée — vérifié en dev). Une erreur pendant le streaming (ex. clé
  invalide) est journalisée côté serveur et remplacée par un message d'erreur assistant
  persisté dans l'historique, plutôt que de faire planter la requête.
- `ChatPanel.tsx` (client) : lit `response.body` via `getReader()`/`TextDecoder` et
  ajoute chaque delta au message assistant en cours — c'est l'affichage progressif.
  Indicateur de frappe (points animés) affiché tant que le message assistant est vide
  et que l'envoi est en cours.
- Accessible depuis le dashboard via un nouvel item de navigation « Assistant IA »
  (`components/layout/AppSidebar.tsx`, `NAV_MAIN`) plutôt qu'un lien uniquement sur la
  page dashboard elle-même — cohérent avec le seul lien de nav existant
  (« Tableau de bord ») et rend la fonctionnalité accessible depuis tout l'espace
  protégé, pas seulement `/dashboard`.
- Vérifié en dev (serveur + DB locale, avec cookie de session réel) : garde d'auth
  (401 sans session, 307 sur la page sans session), 503 sans `ANTHROPIC_API_KEY`
  configurée sans effet de bord en base, et avec une clé invalide un vrai appel à
  l'API Anthropic échoue proprement — le message utilisateur et un message d'erreur
  assistant sont bien persistés et relus via `GET`.

## Captures attendues
Conversation avec l'assistant, réponse affichée progressivement (streaming).
Nécessite une vraie `ANTHROPIC_API_KEY` configurée pour capturer une réponse réelle —
le comportement de streaming/persistance a été vérifié fonctionnellement en dev (voir
Notes techniques), mais une réponse IA complète n'est pas observable sans clé valide
dans cet environnement.

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-16 (implement) — démarrage
- 2026-07-16 (implement) — implémenté : modèles `Conversation`/`ChatMessage` +
  migration, `lib/ai.ts#streamChat`/`logChatUsage`, couche de données `lib/ai-chat.ts`,
  route `app/api/ai/chat/route.ts` (GET historique, POST streaming texte brut),
  `ChatPanel.tsx` (historique, saisie, indicateur de frappe, affichage progressif),
  page `app/(protected)/ai/chat/page.tsx`, lien de nav « Assistant IA » dans
  `AppSidebar.tsx`. Fichiers : `prisma/schema.prisma`,
  `prisma/migrations/20260716170000_add_ai_chat/`, `lib/ai.ts`, `lib/ai-chat.ts`,
  `app/api/ai/chat/route.ts`, `app/(protected)/ai/chat/page.tsx`,
  `components/ai/ChatPanel.tsx`, `components/layout/AppSidebar.tsx`. `tsc --noEmit`,
  `eslint` et `next build` passent ; migration appliquée ; vérifié fonctionnellement en
  dev avec session réelle (garde d'auth, 503 sans clé IA sans effet de bord, erreur de
  streaming avec clé invalide correctement dégradée et persistée).
