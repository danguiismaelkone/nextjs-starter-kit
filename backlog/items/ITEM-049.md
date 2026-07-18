---
id: ITEM-049
title: Branding et personnalisation d'organisation (logo, couleurs)
status: implemented
priority: P2
type: feature
estimate: M
depends_on: [ITEM-017]
created: 2026-07-16
updated: 2026-07-16
---

## Idée / contexte
Premier pas vers le White Label (ITEM-068/ITEM-069) : permettre à chaque organisation de
personnaliser légèrement son espace au-delà des simples informations (ITEM-017).

## User story
En tant qu'admin d'organisation, je veux personnaliser les couleurs et le logo affichés
dans l'application, afin que l'espace ressemble à mon identité visuelle.

## Critères d'acceptation
- [x] Section « Branding » dans les paramètres d'organisation (ITEM-017) permet de
      définir une couleur primaire et un logo.
- [x] Les valeurs personnalisées surchargent les variables CSS shadcn (`--primary`,
      etc.) au chargement de l'organisation active, sans casser le thème clair/sombre.
- [x] Une organisation sans personnalisation garde le thème par défaut inchangé.

## Notes techniques
Champ `Organization.primaryColor` (hex `#rrggbb`, nullable) ; `logo` existait déjà
(ITEM-017). `lib/theme.ts` expose `isValidHexColor`, `getContrastingForeground` (calcul
de luminance WCAG pour choisir un `--primary-foreground` lisible) et
`buildBrandingStyle()` qui retourne `{ "--primary", "--primary-foreground" }` ou
`undefined` si pas de couleur.
Fichiers : `prisma/schema.prisma`, `prisma/migrations/20260716240000_add_organization_branding/`,
`lib/theme.ts`, `lib/organization.ts` (`CurrentOrganization.primaryColor`),
`app/(protected)/layout.tsx`, `app/(protected)/settings/organizations/[id]/branding/page.tsx`,
`app/(protected)/settings/organizations/[id]/branding/actions.ts`,
`components/tenant/BrandingForm.tsx`, `components/tenant/OrganizationForm.tsx`,
`app/(protected)/settings/organizations/[id]/actions.ts`,
`app/(protected)/settings/page.tsx`.

Décisions :
- **Application scoping** : le style est injecté via la prop `style` de
  `SidebarProvider` dans `app/(protected)/layout.tsx` (calculé depuis l'organisation
  active, `getCurrentOrganization()`), donc tout le sous-arbre protégé en hérite par
  cascade CSS normale — les pages publiques (login, register...) restent hors de portée
  puisqu'elles ne sont pas sous ce wrapper. Un style inline gagne toujours sur les
  règles `:root`/`.dark` de `globals.css` (spécificité), donc la personnalisation
  s'applique identiquement en clair et en sombre sans dupliquer de logique par thème.
- **Seules `--primary`/`--primary-foreground` sont surchargées** — aucune autre
  variable (`--background`, `--card`, `--sidebar`, etc.) n'est touchée, donc le thème
  clair/sombre reste intact par construction (critère 2), pas seulement par convention.
- **Logo déplacé de la page principale (ITEM-017) vers la nouvelle page Branding** :
  la section Branding doit permettre de définir logo ET couleur (critère 1) ; dupliquer
  le champ dans les deux formulaires aurait été source de confusion sur la source de
  vérité. `OrganizationForm` (nom/slug) pointe désormais vers `/branding` via un lien.
- **Contraste automatique** plutôt qu'un second color picker pour le texte : luminance
  relative WCAG sur la couleur choisie détermine noir ou blanc, évitant un texte
  illisible sur une couleur de marque claire.
- **Navigation** : la page hub `/settings` ne liait vers aucune page de paramètres
  d'organisation (lacune pré-existante depuis ITEM-017) — ajout d'un lien « Organisation »
  (gardé par `canManageOrg`, même garde que Clés API/Webhooks) pour que Branding soit
  atteignable depuis l'UI.

Vérification fonctionnelle (dev + DB réelle) :
- `isValidHexColor`/`getContrastingForeground`/`buildBrandingStyle` testés directement
  (cas valides, invalides, contrastes clair/sombre).
- Organisation sans couleur : page `/dashboard` rendue sans aucun style inline
  `--primary` (thème par défaut inchangé, critère 3).
- Couleur `#2563eb` posée en DB : `/dashboard` rendu avec
  `style="...--primary:#2563eb;--primary-foreground:#ffffff"` ; page `/branding` reflète
  la couleur persistée dans le picker et le champ texte ; page publique `/login` non
  affectée (hors du sous-arbre protégé).
- Retour à `primaryColor: null` : override disparu de `/dashboard`, confirmant le
  comportement réversible.
- Gardes d'accès : page Branding redirige vers `/login` sans session, 404 sur un id
  d'organisation inexistant ou dont l'utilisateur n'est pas membre (même garde que
  ITEM-017, non dupliquée).

## Captures attendues
Couleur primaire personnalisée appliquée à l'interface, en thème clair et sombre.

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-16 (implement) — démarrage
- 2026-07-16 (implement) — implémenté : couleur primaire + logo d'organisation
  surchargeant `--primary`/`--primary-foreground` via style inline sur le layout
  protégé, page Branding dédiée. Fichiers : `prisma/schema.prisma`, `lib/theme.ts`,
  `lib/organization.ts`, `app/(protected)/layout.tsx`,
  `app/(protected)/settings/organizations/[id]/branding/{page,actions}.tsx`,
  `components/tenant/{BrandingForm,OrganizationForm}.tsx`,
  `app/(protected)/settings/organizations/[id]/actions.ts`,
  `app/(protected)/settings/page.tsx`. Vérifié fonctionnellement en dev contre la DB
  réelle : override appliqué/retiré dynamiquement, thème par défaut inchangé sans
  personnalisation, pages publiques non affectées, gardes d'accès owner/admin actives.
