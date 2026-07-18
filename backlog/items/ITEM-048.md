---
id: ITEM-048
title: Webhooks sortants (configuration côté organisation)
status: implemented
priority: P2
type: feature
estimate: M
depends_on: [ITEM-013]
created: 2026-07-16
updated: 2026-07-16
---

## Idée / contexte
Certaines organisations voudront réagir en temps réel aux événements de la plateforme
(nouvel utilisateur, facture payée...) dans leurs propres systèmes.

## User story
En tant qu'admin d'organisation, je veux configurer des webhooks vers mes propres
systèmes, afin d'être notifié en temps réel des événements de mon organisation.

## Critères d'acceptation
- [x] Page `/settings/webhooks` permet d'ajouter une URL cible et de sélectionner les
      types d'événements à recevoir.
- [x] Chaque envoi est signé (HMAC avec un secret par webhook) pour permettre au
      récepteur de vérifier l'authenticité.
- [x] Historique des derniers envois (statut, code retour) consultable, avec re-envoi
      manuel possible en cas d'échec.

## Notes techniques
Modèle `Webhook` (organizationId, url, secret, events[], enabled) + `WebhookDelivery`
(event, payload, statusCode, success, errorMessage) — cascade delete sur webhook.
Fichiers : `prisma/schema.prisma`, `prisma/migrations/20260716230000_add_webhooks/`,
`lib/webhooks.ts`, `lib/webhook-events.ts`, `lib/organization.ts` (nouvel export
`requireOrganizationAdmin`), `app/api/settings/webhooks/route.ts`,
`app/api/settings/webhooks/[id]/route.ts`,
`app/api/settings/webhooks/[id]/deliveries/route.ts`,
`app/api/settings/webhooks/[id]/deliveries/[deliveryId]/redeliver/route.ts`,
`app/(protected)/settings/webhooks/page.tsx`,
`components/settings/WebhooksSection.tsx`, `app/(protected)/settings/page.tsx`
(lien + renommage `canManageApiKeys` → `canManageOrg`, réutilisé pour Clés API et
Webhooks), `app/invite/accept/actions.ts` et `lib/billing.ts` (déclenchement
`member.joined` / `invoice.paid`).

Décisions :
- **Secret en clair, pas hashé** (contrairement à `ApiKey`/ITEM-047) : le serveur doit
  signer activement chaque envoi sortant avec ce secret, il ne s'agit pas d'un
  identifiant simplement vérifié comme une clé API bearer.
- **Catalogue d'événements volontairement restreint** (`lib/webhook-events.ts`) aux deux
  points de déclenchement réels déjà branchés dans l'app (`member.joined` dans
  `app/invite/accept/actions.ts`, `invoice.paid` dans `lib/billing.ts`) plutôt qu'un
  catalogue spéculatif plus large.
- `lib/webhook-events.ts` séparé de `lib/webhooks.ts` : ce dernier importe `node:crypto`
  et Prisma, ce qui casserait le bundle client si le catalogue d'événements (utilisé par
  le composant client de création) restait dans le même fichier.
- `requireOrganizationAdmin()` extrait dans `lib/organization.ts` (nouveau) pour éviter
  de dupliquer le garde-fou owner/admin déjà écrit en ligne pour ITEM-047 — pas
  rétrofité dans les routes existantes d'ITEM-047 (hors périmètre de cet item).
- **Bug de sécurité trouvé et corrigé avant tout test utilisateur** : le `secret` en
  clair fuitait dans `GET /api/settings/webhooks` et dans le rendu serveur de
  `/settings/webhooks` (liste), alors que seule la réponse de création doit le révéler.
  Corrigé dans la route GET, dans le mapping de la page serveur, et dans l'interface
  `WebhookEntry` du composant client.

Vérification fonctionnelle de bout en bout (dev + DB réelle + récepteur HTTP local) :
- Création via `POST /api/settings/webhooks` → secret révélé une seule fois ; `GET`
  suivant confirmé sans `secret`.
- `triggerWebhooks("member.joined", …)` déclenché directement → requête POST reçue par
  un récepteur local (`127.0.0.1:8899`), en-tête `X-Webhook-Signature` recalculé
  indépendamment (HMAC-SHA256 en Python avec le secret capturé) et confirmé identique.
  Ligne `WebhookDelivery` créée avec `statusCode: 200`, `success: true`, payload correct.
- Re-envoi manuel (`POST .../deliveries/[deliveryId]/redeliver`) → nouvelle ligne
  d'historique créée, second POST reçu par le récepteur.
- `DELETE` : 401 sans session, 200 avec session owner/admin, webhook absent de la liste
  ensuite, et `WebhookDelivery` associées supprimées en cascade (vérifié en DB, 0
  restantes).

## Captures attendues
Webhook configuré, historique d'envoi avec un code retour, re-envoi manuel réussi.

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-16 (implement) — démarrage
- 2026-07-16 (implement) — implémenté : webhooks sortants avec signature HMAC,
  historique et re-envoi manuel. Fichiers : `prisma/schema.prisma`, `lib/webhooks.ts`,
  `lib/webhook-events.ts`, `lib/organization.ts`, `app/api/settings/webhooks/**`,
  `app/(protected)/settings/webhooks/page.tsx`, `components/settings/WebhooksSection.tsx`,
  `app/(protected)/settings/page.tsx`, `app/invite/accept/actions.ts`, `lib/billing.ts`.
  Bug de sécurité trouvé et corrigé avant test (fuite du secret en liste). Vérifié
  fonctionnellement de bout en bout : signature HMAC recalculée indépendamment et
  confirmée, historique de livraison, re-envoi manuel, suppression avec cascade — tous
  testés contre un récepteur HTTP local réel et la DB.
