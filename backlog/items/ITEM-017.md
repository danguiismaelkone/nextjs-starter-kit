---
id: ITEM-017
title: Page paramètres d'organisation (infos, logo, slug)
status: implemented
priority: P1
type: feature
estimate: S
depends_on: [ITEM-013]
created: 2026-07-16
updated: 2026-07-16
---

## Idée / contexte
Une fois l'organisation modélisée (ITEM-013), il faut une page pour que ses admins
puissent en éditer les informations de base.

## User story
En tant qu'admin d'organisation, je veux modifier le nom, le logo et le slug de mon
organisation, afin de personnaliser mon espace.

## Critères d'acceptation
- [x] Page `/settings/organizations/[id]` avec formulaire nom/slug/logo (upload via
      module upload, voir ITEM-028).
- [x] Le slug est unique et validé (format URL-safe).
- [x] Seuls les rôles `owner`/`admin` de l'organisation peuvent éditer ces informations.

## Notes techniques
`OrganizationForm.tsx` écrit à la main plutôt que repris tel quel du module
`multi-tenant` FATIHOUNE : le module suppose son propre modèle de rôles
(owner/admin/manager/member complet, cf. `roles-permissions`) et son propre système
d'upload, alors que ce projet n'a pour l'instant que `Membership.role`
(owner/admin/member, ITEM-013) et pas encore de stockage de fichiers (ITEM-027/028).
Le formulaire garde la même forme (nom, slug, logo) mais logo = simple champ URL texte
pour l'instant, avec une note explicite renvoyant à ITEM-028 pour l'upload réel.

Contrôle d'accès en profondeur (page **et** action) :
- `page.tsx` : `notFound()` si l'utilisateur n'est pas membre actif de
  l'organisation (n'expose ni son existence ni ses infos) ; `redirect("/dashboard")`
  s'il est membre mais ni `owner` ni `admin`.
- `actions.ts` (`updateOrganizationAction`) revérifie la même règle côté serveur —
  la garde de la page seule ne suffit pas contre un appel direct de l'action.

Slug : regex `^[a-z0-9]+(-[a-z0-9]+)*$` (même convention que `slugify()` dans
`lib/organization.ts`), valeur soumise passée en minuscules avant validation ;
unicité vérifiée par requête excluant l'organisation courante (`NOT: { id }`).

Aucun lien de navigation n'a été ajouté vers cette page (ex. depuis `OrgSwitcher` ou
`NavUser`) — hors périmètre des critères de cet item, qui ne demandent que la page et
ses gardes ; accessible dès aujourd'hui via l'URL directe
`/settings/organizations/<id>`.

Fichiers : `app/(protected)/settings/organizations/[id]/page.tsx`,
`app/(protected)/settings/organizations/[id]/actions.ts` (nouveau, hors liste
initiale), `components/tenant/OrganizationForm.tsx`. Aucune migration Prisma requise
(schéma déjà posé par ITEM-013).

## Captures attendues
Formulaire d'édition d'organisation rempli, sauvegarde réussie (message de
confirmation), tentative d'édition d'un slug déjà pris rejetée, accès en tant que
membre simple (non owner/admin) redirigé vers `/dashboard`.

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-16 (implement) — démarrage
- 2026-07-16 (implement) — implémenté : page `/settings/organizations/[id]`
  (formulaire nom/slug/logo-URL), garde d'accès en profondeur (page + action) limitant
  l'édition aux membres `owner`/`admin` de l'organisation, slug validé (regex
  URL-safe) et vérifié unique hors organisation courante. Fichiers :
  app/(protected)/settings/organizations/[id]/page.tsx,
  app/(protected)/settings/organizations/[id]/actions.ts,
  components/tenant/OrganizationForm.tsx. `tsc --noEmit`, `eslint .` et `next build`
  OK (nouvelle route `/settings/organizations/[id]` confirmée dans la sortie de
  build) ; regex de slug vérifiée unitairement (rejette majuscules, underscores,
  tirets en tête/queue, doubles tirets).
- 2026-07-16 (implement) — démarrage
