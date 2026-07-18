---
id: ITEM-055
title: Durcissement sécurité applicative (CSRF, headers, validation)
status: implemented
priority: P1
type: chore
estimate: M
depends_on: []
created: 2026-07-16
updated: 2026-07-16
---

## Idée / contexte
Avant une mise en production d'un SaaS Core destiné à être réutilisé, les protections
de sécurité HTTP et de validation standard doivent être vérifiées et complétées
transversalement.

## User story
En tant que plateforme, je veux appliquer les protections de sécurité standard, afin de
réduire la surface d'attaque avant une mise en production.

## Critères d'acceptation
- [x] En-têtes de sécurité HTTP (CSP, X-Frame-Options, X-Content-Type-Options,
      Referrer-Policy) configurés dans `next.config.ts`.
- [x] Toutes les entrées utilisateur (formulaires, API) sont validées côté serveur avec
      un schéma (Zod), pas seulement côté client.
- [x] Les requêtes mutantes (POST/PUT/DELETE) issues de Server Actions bénéficient de la
      protection CSRF native de Next.js, vérifiée explicitement pour les routes API
      custom.

## Notes techniques
Audit transversal — ne réimplémente pas de fonctionnalité, corrige/complète
l'existant.
Fichiers : `next.config.ts`, `proxy.ts`, `lib/validation.ts`, `lib/validators/*`, et
~25 routes `app/api/**` + 10 Server Actions `**/actions.ts` mises à jour pour utiliser
Zod (liste complète dans le Journal).

Décisions à l'implémentation :
- **En-têtes (`next.config.ts`)** : CSP construite dynamiquement (dérive l'origine S3
  de `S3_ENDPOINT` pour `img-src`/`connect-src`/`media-src`, car le host de stockage
  change selon le déploiement — MinIO local, AWS S3, Cloudflare R2). `script-src`
  utilise `'unsafe-inline'` (pas de nonce) : Next.js injecte des scripts inline pour
  l'hydratation et aucune infra de nonce (middleware + lecture dans le layout)
  n'existait — migrer vers une CSP nonce-based est un axe d'amélioration futur possible
  mais hors périmètre de cet audit. `https://www.gstatic.com` autorisé en `script-src`
  pour le SDK Firebase Messaging chargé par le service worker (ITEM-036). Vérifié :
  aucune balise `<script src="...">` externe ni `<iframe>`/`<embed>` autre que les
  aperçus de documents (S3 signé) n'existe dans le code — CSP testée sans régression
  visible (page d'accueil 200, en-têtes présents).
- **CSRF (`proxy.ts`, renommé depuis `middleware.ts` — convention Next.js 16, avertie
  dépréciée au build)** : plutôt que d'ajouter une vérification par route (29 fichiers),
  un point d'entrée centralisé applique la même logique que la protection native des
  Server Actions Next.js (comparaison `Origin` / origine de la requête) à toute requête
  mutante sous `app/api/**`, à l'exception de `v1/*` (authentifié par clé API, pas de
  cookie ambiant, ITEM-053/054), `webhooks/*` (signature Stripe, pas de navigateur) et
  `auth/*` (Better Auth gère déjà sa propre vérification d'origine). Une requête
  mutante sans en-tête `Origin`, ou avec un `Origin` ne correspondant pas à l'hôte de la
  requête, est rejetée en 403 avant d'atteindre la route.
- **Validation Zod (`lib/validation.ts` + `lib/validators/*`)** : nouvelle dépendance
  `zod` (absente du projet avant cet item — délibérément introduite ici, le reste du
  code utilise des vérifications `typeof` manuelles). Helpers génériques
  `parseJsonBody`/`parseSearchParams`/`parseFormData`/`zodFieldErrors` dans
  `lib/validation.ts`, schémas par domaine dans `lib/validators/{ai,billing,documents,
  folders,push-tokens,settings,admin,organization}.ts`. Convertis : les ~21 routes
  `app/api/**` (hors `v1/*`, déjà couvert par ITEM-053, et hors requêtes sans corps —
  `DELETE`/`POST` sur seul paramètre d'URL, où Prisma scope déjà par organisation et un
  format invalide se résout simplement en 404) et les 10 Server Actions (`"use server"`)
  du repo. Comportement/messages d'erreur préservés à l'identique partout où c'était
  pertinent ; quelques cas rendus **plus stricts** qu'avant (ex. `settings/webhooks`
  n'ignore plus silencieusement un événement de type invalide dans le tableau, il
  rejette toute la requête — comportement plus sûr, pas une régression fonctionnelle
  attendue côté UI qui n'envoie jamais un tel tableau).
- **Hors périmètre, décisions assumées** :
  - `app/api/documents/upload` et `app/api/profile/avatar` (upload de fichiers,
    `FormData`) : le `File` lui-même reste validé manuellement (taille, type MIME,
    présence) — déjà rigoureux côté serveur avant cet item, et Zod n'a pas de support
    natif pratique pour les objets `File` de `FormData`. Seul le champ `folderId`
    (upload de documents) est passé sous Zod.
  - Pagination `/api/v1/*` (`lib/api-response.ts#parsePagination`, ITEM-053) : laissée
    telle quelle (coercition défensive avec bornes, pas de risque d'injection) plutôt
    que réécrite en Zod, pour ne pas re-toucher une surface déjà livrée et vérifiée sans
    valeur de sécurité additionnelle.
  - Identifiants opaques passés directement en paramètre de Server Action (ex.
    `userId`, `token`, `organizationId` de `superadmin/actions.ts`,
    `invite/accept/actions.ts`, `lib/organization-actions.ts`) : validés par un schéma
    Zod minimal (présence/type) — la véritable autorisation reste la vérification
    d'appartenance/rôle en base juste après, Zod n'ajoute ici qu'une validation de
    forme.
- Vérifié en dev avec une vraie session (compte seed `owner@example.com`) : en-têtes de
  sécurité présents sur `/`, requête `POST` cross-origin (`Origin: evil.com`) → 403
  avant d'atteindre la route, requête sans `Origin` → 403, requête same-origin avec
  session absente → 401 (ordre des checks préservé), `POST /api/folders` avec nom vide
  ou nom > 100 caractères → 400 `"Nom de dossier invalide."`, nom valide → 201 avec
  dossier créé (nettoyé après coup), `POST /api/ai/generate` avec prompt vide → 400
  `"Instruction vide."`, `POST /api/settings/webhooks` avec URL invalide → 400
  `"URL invalide."`, avec type d'événement invalide → 400
  `"Sélectionnez au moins un type d'événement valide."`. `tsc --noEmit`, `eslint` et
  `next build` (production) passent sans erreur ni avertissement nouveau — la
  dépréciation `middleware.ts` détectée pendant la vérification a été corrigée
  (renommage en `proxy.ts`).

## Captures attendues
En-têtes de sécurité visibles dans les réponses HTTP (outils navigateur), formulaire
avec entrée invalide rejetée côté serveur. Vérifié fonctionnellement en dev via `curl`
(voir Notes techniques : en-têtes, 403 CSRF cross-origin, 400 Zod sur plusieurs routes) ;
une capture d'écran des en-têtes dans les DevTools navigateur et d'un formulaire
rejeté en UI reste à faire par `backlog-test`.

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-16 (implement) — démarrage
- 2026-07-16 (implement) — implémenté : en-têtes de sécurité HTTP (`next.config.ts`,
  CSP dynamique + X-Frame-Options/X-Content-Type-Options/Referrer-Policy) ; CSRF
  centralisé pour les routes API custom (`proxy.ts`, exclut `v1/*`/`webhooks/*`/
  `auth/*`) ; introduction de Zod (`lib/validation.ts`, `lib/validators/{ai,billing,
  documents,folders,push-tokens,settings,admin,organization}.ts`) et migration de la
  validation manuelle vers Zod dans ~21 routes `app/api/**` (ai/chat, ai/generate,
  ai/ocr, ai/summarize, billing/change-plan, billing/checkout, documents/[id],
  documents/[id]/shares, documents/generate, documents/search, documents/upload,
  folders, folders/[id], push-tokens, settings/api-keys, settings/webhooks) et 10
  Server Actions (register/actions, admin/invitations/actions, admin/users/actions,
  roles/[id]/actions, settings/actions, settings/organizations/[id]/actions,
  settings/organizations/[id]/branding/actions, superadmin/actions,
  invite/accept/actions, lib/organization-actions). `tsc --noEmit`, `eslint` et
  `next build` passent ; vérifié fonctionnellement en dev via `curl` avec une session
  réelle (voir Notes techniques).
- 2026-07-16 (implement) — démarrage
