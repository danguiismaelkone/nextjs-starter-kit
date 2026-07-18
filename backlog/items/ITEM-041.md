---
id: ITEM-041
title: Génération de contenu (texte)
status: implemented
priority: P2
type: feature
estimate: M
depends_on: [ITEM-039]
created: 2026-07-16
updated: 2026-07-16
---

## Idée / contexte
Au-delà du chat (ITEM-040), un besoin fréquent est de générer un brouillon de texte
directement dans un champ existant (email, description...).

## User story
En tant qu'utilisateur, je veux générer un brouillon de texte à partir d'une
instruction, afin de gagner du temps de rédaction.

## Critères d'acceptation
- [x] Un point d'entrée générique (« Générer avec l'IA ») accepte un prompt utilisateur
      et un contexte optionnel, et retourne un texte éditable.
- [x] Le résultat est inséré dans le champ d'origine sans écraser silencieusement le
      contenu déjà saisi (confirmation si non vide).

## Notes techniques
Réutilise `lib/ai.ts` (ITEM-039).
Fichiers : `components/ai/GenerateButton.tsx`, `app/api/ai/generate/route.ts`.

Décisions à l'implémentation :
- `GenerateButton` est un **composant contrôlé générique** (`value`/`onChange`/
  `context?`/`label?`/`instructionPlaceholder?`), attachable à n'importe quel champ
  texte contrôlé de l'application — pas seulement celui de la démo. Il gère lui-même
  son dialog d'instruction, l'appel API, l'aperçu éditable du résultat (le texte généré
  est visible avant insertion, donc « texte éditable » au sens du critère — l'utilisateur
  voit le résultat avant qu'il ne remplace quoi que ce soit) et la confirmation de
  remplacement (`AlertDialog`) si `value` n'est pas vide.
- `app/api/ai/generate/route.ts` : non-streamé (contrairement au chat ITEM-040) — un
  résultat discret suffit ici, réutilise directement `generateText()` de `lib/ai.ts`
  (ITEM-039), avec un prompt système dédié qui contraint la réponse au texte brut
  généré (pas de préambule/guillemets, pour une insertion directe).
- **Aucun champ « prose » pré-existant** dans le repo à ce jour (les formulaires
  existants — nom d'organisation, e-mail d'invitation, slug — sont des identifiants
  courts, pas du texte à rédiger ; les convertir en champs prêts pour l'IA serait
  hors périmètre de cet item). Démonstration donc via une page dédiée
  `/ai/generate` (`GenerateDemo.tsx`, un `Textarea` contrôlé + `GenerateButton`),
  suivant le même schéma que `/ai/chat` (ITEM-040) — quand un vrai champ de prose
  apparaîtra dans un item futur (ex. bio du profil ITEM-045, description
  d'organisation), il pourra adopter `GenerateButton` tel quel sans modification.
- Composants shadcn ajoutés : `Textarea` (n'existait pas encore dans `components/ui/`).
- Accessible depuis le dashboard via un nouvel item de navigation « Génération de
  texte » dans `AppSidebar.tsx` (`NAV_MAIN`), à côté de « Assistant IA ».
- Vérifié en dev (serveur + session réelle) : garde d'auth (401/307), 400 sur
  instruction vide, 503 explicite sans `ANTHROPIC_API_KEY`, et avec une clé invalide un
  vrai appel à l'API Anthropic échoue proprement en 503 (pas de crash serveur).

## Captures attendues
Bouton « Générer avec l'IA » sur un champ texte, résultat inséré après génération.
Nécessite une vraie `ANTHROPIC_API_KEY` configurée pour capturer une génération réelle —
le comportement du point d'entrée (garde d'auth, validation, dégradation propre en cas
d'erreur IA) a été vérifié fonctionnellement en dev (voir Notes techniques), mais un
texte généré réel n'est pas observable sans clé valide dans cet environnement.

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-16 (implement) — démarrage
- 2026-07-16 (implement) — implémenté : `GenerateButton.tsx` (composant contrôlé
  générique, dialog instruction → aperçu → confirmation de remplacement),
  `app/api/ai/generate/route.ts` (non-streamé, réutilise `generateText()`), démo
  `GenerateDemo.tsx` sur la page `app/(protected)/ai/generate/page.tsx`, lien de nav
  « Génération de texte », composant shadcn `Textarea` ajouté. Fichiers :
  `app/api/ai/generate/route.ts`, `app/(protected)/ai/generate/page.tsx`,
  `components/ai/GenerateButton.tsx`, `components/ai/GenerateDemo.tsx`,
  `components/ui/textarea.tsx`, `components/layout/AppSidebar.tsx`. `tsc --noEmit`,
  `eslint` et `next build` passent ; vérifié fonctionnellement en dev avec session
  réelle (garde d'auth, validation 400, 503 sans clé IA, 503 propre avec clé invalide
  sur un vrai appel à l'API Anthropic).
