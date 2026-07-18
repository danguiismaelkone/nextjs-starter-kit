---
id: ITEM-015
title: Sélecteur d'organisation (switch tenant)
status: verified
priority: P0
type: feature
estimate: M
depends_on: [ITEM-013, ITEM-009]
created: 2026-07-16
updated: 2026-07-16
---

## Idée / contexte
Un utilisateur peut appartenir à plusieurs organisations. Il faut pouvoir basculer entre
elles depuis la sidebar (ITEM-009) sans se reconnecter.

## User story
En tant qu'utilisateur membre de plusieurs organisations, je veux changer
d'organisation active depuis la sidebar, afin de travailler sur le bon contexte de
données.

## Critères d'acceptation
- [x] Un `OrgSwitcher` dans le header de la sidebar liste les organisations de
      l'utilisateur et permet d'en changer.
- [x] Le changement d'organisation active persiste (cookie/session) et recharge les
      données scoped-org (dashboard, listes).
- [x] Si l'utilisateur n'appartient qu'à une organisation, le sélecteur reste discret
      (pas de bruit inutile).

## Notes techniques
`OrgSwitcher` remplace le bloc « logo + nom d'app » statique du header (le bloc visuel
— icône badge + libellé tronqué — est conservé, seul le contenu devient dynamique) :
- 1 seule organisation → simple `Link` vers `/dashboard`, comme avant cet item (aucun
  chevron, aucun dropdown) : c'est le cas « discret » du 3ᵉ critère.
- 2+ organisations → `DropdownMenu` (mêmes primitives que `NavUser.tsx`) listant les
  organisations avec coche sur l'active, `onClick` appelle la Server Action de
  changement puis `router.refresh()`.

Persistance : cookie httpOnly `active_organization_id` (`lib/organization.ts`).
`getCurrentOrganization()` le consulte en priorité, retombe sur la plus ancienne
adhésion active si absent/périmé/organisation quittée — non-régressif pour
ITEM-013/ITEM-014.

**Déviation par rapport aux « Fichiers » listés** : la Server Action de changement
d'organisation a dû être extraite dans un nouveau fichier
`lib/organization-actions.ts` (directive `"use server"` en tête de **fichier**), et
non ajoutée dans `lib/organization.ts` comme prévu. Une directive `"use server"` posée
seulement au niveau de la fonction ne suffit pas : dès qu'un Client Component importe
quoi que ce soit du module, Next.js embarque tout le reste du fichier — ici
`@/lib/prisma` (donc `pg`) — dans le bundle navigateur, ce qui casse le build
(`Module not found: Can't resolve 'util/types'`, `tls`, etc., confirmé en local). Seul
un fichier dédié avec `"use server"` en tête de fichier isole correctement
l'implémentation serveur du bundle client.

**Critère 2 (« recharge les données scoped-org »)** : `lib/dashboard.ts`
(`getStats`/`getChartData`) et `app/(protected)/dashboard/page.tsx` ont dû être
touchés en plus des fichiers listés — sans quoi changer d'organisation n'aurait eu
aucun effet visible et le critère n'aurait pas de sens. Scope volontairement limité au
dashboard : `/admin/users` reste non filtré par organisation, c'est le périmètre
explicite d'ITEM-016. `dashboard/page.tsx` utilise `getCurrentOrganization()` (pas
`requireOrganization()`) : cette page EST `/dashboard`, donc le repli de
`requireOrganization()` (`redirect("/dashboard")`) y bouclerait indéfiniment pour un
utilisateur sans organisation.

Fichiers : `components/layout/AppSidebar.tsx`, `components/layout/OrgSwitcher.tsx`
(nouveau), `lib/organization.ts`, `lib/organization-actions.ts` (nouveau, hors liste
initiale), `app/(protected)/layout.tsx`, `lib/dashboard.ts` (hors liste initiale),
`app/(protected)/dashboard/page.tsx` (hors liste initiale).

## Captures attendues
Sidebar avec sélecteur d'organisation ouvert (dropdown, coche sur l'active) — nécessite
un utilisateur avec 2+ organisations pour être visible, sinon le header n'affiche que le
lien discret. Idéalement : deux organisations avec des KPI dashboard différents, pour
montrer que les chiffres changent après bascule.

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-16 (implement) — démarrage
- 2026-07-16 (implement) — implémenté : `OrgSwitcher` intégré au header de
  `AppSidebar` (discret si 1 org, dropdown avec coche si 2+), cookie httpOnly
  `active_organization_id` consulté en priorité par `getCurrentOrganization()`,
  Server Action `switchOrganizationAction` déplacée dans `lib/organization-actions.ts`
  (contrainte de bundling Next.js — voir Notes techniques), `lib/dashboard.ts` +
  `dashboard/page.tsx` scopés par organisation active. Fichiers :
  components/layout/AppSidebar.tsx, components/layout/OrgSwitcher.tsx,
  lib/organization.ts, lib/organization-actions.ts, app/(protected)/layout.tsx,
  lib/dashboard.ts, app/(protected)/dashboard/page.tsx. `tsc --noEmit`, `eslint .` et
  `next build` OK (le build a d'abord échoué à cause de la directive `"use server"`
  au niveau fonction — corrigé en extrayant un fichier dédié, re-testé OK).
- 2026-07-16 (verify) — vérifié : les 3 critères sont satisfaits (revue de
  `components/layout/OrgSwitcher.tsx`, `components/layout/AppSidebar.tsx`,
  `lib/organization.ts`, `lib/organization-actions.ts`,
  `app/(protected)/layout.tsx`, `lib/dashboard.ts`,
  `app/(protected)/dashboard/page.tsx`). `switchOrganizationAction` valide bien
  l'appartenance active avant de faire confiance à l'id fourni par le client.
  `tsc --noEmit`, `eslint .`, `next build` et `prisma migrate status` OK (re-exécutés
  indépendamment). Aucun code mort. Observations non bloquantes : pas de message
  d'erreur affiché si `switchOrganizationAction` échoue (silencieux côté UI) ;
  `/admin/users` reste non scopé par organisation, périmètre explicite d'ITEM-016.
