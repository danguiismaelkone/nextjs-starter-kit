---
id: ITEM-039
title: Fondation intégration IA (client LLM générique)
status: implemented
priority: P2
type: feature
estimate: M
depends_on: []
created: 2026-07-16
updated: 2026-07-16
---

## Idée / contexte
Chaque futur SaaS dérivé du Core aura probablement besoin d'IA à un moment ou un autre
(chat, génération, OCR...). Plutôt que de la brancher au cas par cas, il faut un client
générique réutilisable dès le socle.

## User story
En tant que développeur du SaaS Core, je veux un client IA générique et configurable,
afin que chaque produit dérivé puisse brancher son propre cas d'usage IA sans dupliquer
l'intégration.

## Critères d'acceptation
- [x] `lib/ai.ts` expose un client (SDK Anthropic ou compatible) configuré par variable
      d'environnement, avec gestion des erreurs et des timeouts.
- [x] Un mécanisme de suivi de consommation (tokens/coût) par organisation est
      journalisé, pour anticiper un futur quota lié au plan de facturation (ITEM-020).
- [x] Aucune clé API ni prompt système sensible n'est exposé côté client.

## Notes techniques
Fondation uniquement — pas de fonctionnalité IA visible ici (voir ITEM-040 à ITEM-044).
Fichiers : `lib/ai.ts`.

Décisions à l'implémentation :
- SDK officiel `@anthropic-ai/sdk`. Client construit paresseusement dans
  `getAnthropicClient()` (même pattern que `getStripeClient()`/`getResendClient()`) —
  `null` si `ANTHROPIC_API_KEY` est vide, auquel cas `generateText()` lève une erreur
  explicite au lieu d'échouer silencieusement ou de planter au chargement du module.
- Point d'entrée unique `generateText({ organizationId, system, prompt, maxTokens })` —
  fondation que réutiliseront ITEM-040 (chat), ITEM-041 (génération de contenu),
  ITEM-042/043 (OCR, résumé) plutôt que chacun sa propre intégration.
- Modèle par défaut `claude-opus-4-8`, configurable via `AI_MODEL` — un produit dérivé
  cost-sensitive peut passer à `claude-sonnet-5`/`claude-haiku-4-5` sans toucher au code.
- Timeout configurable via `AI_TIMEOUT_MS` (défaut 60s), passé à la construction du
  client Anthropic ; `Anthropic.APIConnectionTimeoutError` et `Anthropic.APIError` sont
  catchées et reformulées en erreurs explicites en français plutôt que de laisser fuiter
  l'exception SDK brute.
- `AiUsageLog` (organizationId, model, inputTokens, outputTokens, estimatedCostCents,
  createdAt) — écrit à chaque appel de `generateText()`, avant le retour du résultat.
  Table de prix indicative par modèle dans `lib/ai.ts`
  (`MODEL_PRICING_USD_PER_MILLION_TOKENS`, cache 2026-06-24) — sert uniquement à
  l'estimation du coût journalisé, jamais source de vérité pour la facturation réelle ;
  à tenir à jour manuellement si les tarifs Anthropic changent.
- Pas de quota appliqué à ce stade (juste la journalisation demandée par le critère
  d'acceptation) — le rattachement à `Plan`/`Subscription` (ITEM-020) est un futur item,
  hors périmètre ici.
- Critère "aucune clé API ni prompt système exposé côté client" satisfait
  structurellement : `lib/ai.ts` n'a pas de directive `"use client"`, n'est importé par
  aucun composant client (pas d'UI dans cet item), et `ANTHROPIC_API_KEY`/`AI_MODEL` ne
  sont pas préfixées `NEXT_PUBLIC_` — même garantie que `lib/stripe.ts`/`lib/storage.ts`.
- Vérifié en dev (script direct, hors HTTP) : sans `ANTHROPIC_API_KEY`,
  `generateText()` lève "IA non configurée : ..." ; avec une clé invalide, un vrai appel
  à l'API Anthropic échoue proprement avec un message "IA : échec de la requête (401)
  — ...", confirmant la gestion d'erreurs typée.

## Captures attendues
N/A (fondation backend, sans UI). Vérifié fonctionnellement en dev via script direct —
voir Notes techniques.

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-16 (implement) — démarrage
- 2026-07-16 (implement) — implémenté : modèle `AiUsageLog` + migration, `lib/ai.ts`
  (`generateText`, client Anthropic paresseux, gestion erreurs/timeout, journalisation
  tokens/coût par organisation). Fichiers : `prisma/schema.prisma`,
  `prisma/migrations/20260716160000_add_ai_usage_log/`, `lib/ai.ts`, `.env`,
  `.env.example`. `tsc --noEmit`, `eslint` et `next build` passent ; migration
  appliquée ; vérifié fonctionnellement en dev (sans clé → erreur explicite ; avec clé
  invalide → 401 propre via un vrai appel à l'API Anthropic).
