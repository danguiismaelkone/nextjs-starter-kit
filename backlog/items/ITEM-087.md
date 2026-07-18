---
id: ITEM-087
title: Migrer /roles/[id] vers le gabarit fiche/détail (référence)
status: implemented
priority: P2
type: chore
estimate: S
depends_on: [ITEM-085, ITEM-086]
created: 2026-07-18
updated: 2026-07-18
---

## Idée / contexte
`/roles/[id]` (fiche d'un rôle : nom, badge « Système », description, matrice de
permissions) code aujourd'hui sa mise en page à la main
(`app/(protected)/roles/[id]/page.tsx`), sans passer par un en-tête ou une grille de
contenu partagés. C'est la page fiche détail la plus simple du projet (une seule
ressource, un seul bloc de contenu principal) : elle sert de démonstration de
référence pour le nouveau gabarit (ITEM-085 + ITEM-086), avant de l'appliquer aux
pages fiche restantes (ITEM-089).

## User story
En tant que développeur de ce projet, je veux que `/roles/[id]` utilise le nouvel
en-tête et le nouveau gabarit fiche/détail, afin de prouver leur composition sur une
page réelle avant de les généraliser.

## Critères d'acceptation
- [x] `/roles/[id]` utilise le composant d'en-tête d'ITEM-085 : titre = nom du rôle
      (avec le badge « Système » toujours visible s'il est présent), sous-titre =
      la phrase d'aide actuelle (« Cochez les permissions accordées… »).
- [x] `/roles/[id]` utilise le composant de layout d'ITEM-086 : le fil d'Ariane
      (« Rôles ») au-dessus de l'en-tête, la matrice de permissions
      (`PermissionMatrix`) en contenu principal (colonne de gauche).
- [x] Un panneau détails (colonne de droite) est ajouté, listant au minimum : le nom
      du rôle, le statut système/personnalisé, et — si disponibles sur le modèle —
      les dates de création/mise à jour du rôle.
- [x] Le comportement fonctionnel existant de la page (cocher/décocher une permission
      via `PermissionMatrix`, garde d'accès `requireAdmin`/scoping par organisation,
      `notFound()` si le rôle n'existe pas ou appartient à une autre organisation)
      n'est pas modifié — seule la mise en page change.
- [x] Aucune régression TypeScript/lint/build (`tsc --noEmit`, `eslint`, `next
      build`) après la migration.

## Notes techniques
Fichier concerné : `app/(protected)/roles/[id]/page.tsx`. Remplace le
`<div className="flex flex-col gap-6">` actuel (lignes 40-66) par la composition
en-tête (ITEM-085) + layout fiche/détail (ITEM-086). Si le modèle `Role` n'expose pas
`createdAt`/`updatedAt` en base, ne pas ajouter de migration Prisma pour cet item —
se limiter aux champs déjà disponibles (nom, `isSystem`) dans le panneau détails, et
le noter dans le Journal.

Décisions à l'implémentation :
- **`Role` expose déjà `createdAt`/`updatedAt`** (`prisma/schema.prisma`) et la
  requête existante (`findFirst` sans `select`) les renvoyait déjà — aucune migration
  Prisma nécessaire, juste affichés dans `DetailPanelSection` via
  `toLocaleDateString("fr-FR")` (cohérent avec le formatage déjà utilisé ailleurs
  dans le projet, ex. `UsersDataTable`, `superadmin/page.tsx`).
- **Titre composite** : `title={<span className="flex items-center gap-2">{role.name}<Badge .../></span>}`
  — rendu possible car `PageHeader.title` accepte un `ReactNode` (décision
  d'ITEM-085), pas seulement une chaîne.
- **Lien `Link` vers `/roles` retiré** du corps de la page : remplacé par l'entrée
  `{ label: "Rôles", href: "/roles" }` du `breadcrumbs` de `DetailPageLayout` — import
  `next/link` devenu inutile, retiré.

Vérifications effectuées : `npx tsc --noEmit` et `npx eslint "app/(protected)/roles/[id]/page.tsx"`
sans erreur. `next build` complet vérifié conjointement avec ITEM-088 (voir son
Journal) puisque les deux items partagent le même point de contrôle final de ce lot
d'implémentation.

## Captures attendues
`/roles/[id]` avant/après : la nouvelle page montrant le fil d'Ariane, l'en-tête
(titre + badge + sous-titre), la matrice de permissions à gauche et le panneau
détails à droite ; puis la même page en largeur réduite montrant le panneau détails
sous la matrice.

## Journal
- 2026-07-18 (backlog) — créé comme migration de référence pour ITEM-085/ITEM-086,
  avant la migration des pages fiche restantes (ITEM-089).
- 2026-07-18 (implement) — démarrage
- 2026-07-18 (implement) — implémenté : `app/(protected)/roles/[id]/page.tsx` migré
  vers `DetailPageLayout`/`PageHeader` (fil d'Ariane « Rôles », titre composite
  nom+badge, panneau détails nom/statut/dates). Tous les critères couverts.
  `tsc`/`eslint` OK.
