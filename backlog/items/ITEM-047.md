---
id: ITEM-047
title: Clés API (génération, révocation)
status: implemented
priority: P2
type: feature
estimate: M
depends_on: [ITEM-013]
created: 2026-07-16
updated: 2026-07-16
---

## Idée / contexte
Pour permettre l'intégration externe (ITEM-053), les organisations ont besoin de
générer et gérer leurs propres clés API.

## User story
En tant qu'admin d'organisation, je veux générer des clés API pour mon organisation,
afin d'intégrer la plateforme à mes propres outils.

## Critères d'acceptation
- [x] Page `/settings/api-keys` liste les clés existantes (nom, préfixe visible, date de
      création, dernière utilisation) sans jamais réafficher la clé complète après
      création.
- [x] Génération d'une nouvelle clé affiche la valeur complète une seule fois, avec
      avertissement explicite de la copier immédiatement.
- [x] Révocation immédiate d'une clé (les appels utilisant cette clé échouent dès la
      révocation).

## Notes techniques
Clés stockées hashées (jamais en clair) en base, à l'image des mots de passe.
Fichiers : `prisma/schema.prisma` (ApiKey), `app/(protected)/settings/api-keys/page.tsx`.

Décisions à l'implémentation :
- **Hachage** : SHA-256 simple (`node:crypto`), pas bcrypt/scrypt — une clé API générée
  côté serveur (24 octets aléatoires, `sk_` + hex) a une entropie bien supérieure à un
  mot de passe utilisateur, donc un hash rapide suffit (approche standard GitHub/Stripe).
  `hashedKey` est `@unique`, ce qui rend `verifyApiKey()` un simple lookup indexé.
- **`lib/api-keys.ts`** centralise génération/liste/révocation/vérification —
  `verifyApiKey(rawKey)` (rejette une clé révoquée ou inconnue, met à jour
  `lastUsedAt` sur succès) est le point d'entrée explicitement conçu pour être
  réutilisé par l'API publique (ITEM-053), qui n'existe pas encore.
- **Portée volontairement limitée à la gestion des clés**, pas à leur consommation :
  aucun endpoint public authentifié par clé API n'est construit ici — c'est le
  périmètre explicite d'ITEM-053 (« API REST publique versionnée »), qui dépend de cet
  item. Le critère « les appels utilisant cette clé échouent dès la révocation » est
  vérifié directement sur `verifyApiKey()` (le mécanisme qu'ITEM-053 câblera dans sa
  middleware HTTP), pas via un vrai appel réseau à une route publique inexistante.
- **Contrôle d'accès** : réservé aux membres `owner`/`admin` de l'organisation active
  (même règle que `app/(protected)/settings/organizations/[id]`, pas le rôle global
  `User.role`) — vérifié à la fois côté page (redirection) et côté route API (403).
- Lien « Clés API » ajouté sur `/settings`, affiché uniquement si l'utilisateur est
  owner/admin de l'organisation active (masqué pour les simples membres, cohérent avec
  la restriction d'accès de la page elle-même).
- Vérifié en dev avec session réelle (owner) : liste vide puis peuplée après création,
  clé complète retournée une seule fois à la création puis absente de toutes les
  réponses de liste (préfixe masqué uniquement), révocation → 200 puis 404 sur une
  seconde tentative, et surtout `verifyApiKey()` appelé directement en script confirme
  qu'une clé valide résout correctement avant révocation et retourne `null`
  immédiatement après — critère 3 vérifié au niveau du mécanisme.

## Captures attendues
Génération d'une clé avec avertissement de copie unique, liste des clés masquées,
révocation d'une clé. Vérifié fonctionnellement de bout en bout en dev (voir Notes
techniques) ; une capture d'écran réelle du flux UI reste à faire par `backlog-test`.

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-16 (implement) — démarrage
- 2026-07-16 (implement) — implémenté : modèle `ApiKey` + migration, `lib/api-keys.ts`
  (génération, hachage SHA-256, liste, révocation, vérification), routes
  `app/api/settings/api-keys/route.ts` (GET/POST) et
  `app/api/settings/api-keys/[id]/route.ts` (DELETE), page `/settings/api-keys`
  (`ApiKeysSection.tsx` : liste, dialog de création avec révélation unique,
  confirmation de révocation), gate owner/admin, lien conditionnel depuis `/settings`.
  Fichiers : `prisma/schema.prisma`, `prisma/migrations/20260716220000_add_api_key/`,
  `lib/api-keys.ts`, `app/api/settings/api-keys/route.ts`,
  `app/api/settings/api-keys/[id]/route.ts`,
  `app/(protected)/settings/api-keys/page.tsx`,
  `components/settings/ApiKeysSection.tsx`, `app/(protected)/settings/page.tsx`. `tsc
  --noEmit`, `eslint` et `next build` passent ; migration appliquée ; vérifié
  fonctionnellement en dev avec session réelle (création, clé complète affichée une
  seule fois, liste masquée, révocation avec rejet immédiat confirmé via
  `verifyApiKey()` avant/après).
