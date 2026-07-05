---
id: ITEM-011
title: Refonte visuelle des en-têtes & formulaires admin (Utilisateurs & Invitations)
status: verified
priority: P2
type: feature
estimate: S
depends_on: [ITEM-009, ITEM-007, ITEM-008]
created: 2026-07-04
updated: 2026-07-05
---

## Idée / contexte
Une fois le shell (ITEM-009) et le tableau de bord (ITEM-010) en place, la partie
**hors-tableau** des pages Utilisateurs et Invitations doit être mise au même
niveau de finition : en-têtes de page cohérents et formulaires (création, édition,
invitation) homogènes. Le rendu des **listes/tableaux** (badges, tri, états vides,
pagination) est désormais du ressort d'ITEM-012 (adoption du module DataTable) —
cet item ne s'occupe donc plus du tableau lui-même pour éviter le doublon.
Item purement présentation : **aucun changement de comportement**.

## User story
En tant qu'administrateur, je veux des en-têtes de page et des formulaires clairs
et homogènes, afin d'avoir une interface professionnelle cohérente autour des
listes.

## Critères d'acceptation
- [x] En-tête de page cohérent (titre + description + actions primaires alignées) sur `/admin/users` et `/admin/users/invitations`, intégré au shell (plus de mise en page « carte centrée » isolée).
- [x] Les formulaires (création `/admin/users/new`, édition `/admin/users/[id]`, invitation) sont visuellement cohérents avec le reste (espacements, boutons, messages d'erreur/succès homogènes).
- [x] Un éventuel composant d'en-tête de page réutilisable est introduit et utilisé sur les deux pages (cohérence).
- [x] Responsive : en-têtes et formulaires restent lisibles et utilisables sur mobile.
- [x] **Non-régression fonctionnelle** : création, édition, désactivation, invitation/renvoi/révocation continuent de fonctionner (critères d'ITEM-007 et ITEM-008 toujours satisfaits).

## Notes techniques
- Fichiers : `app/admin/users/page.tsx` (en-tête uniquement),
  `app/admin/users/new/page.tsx`, `app/admin/users/[id]/page.tsx`,
  `app/admin/users/invitations/page.tsx` (en-tête + formulaire), composants
  `components/admin/*` (formulaires). Envisager `components/admin/page-header.tsx`.
- **Le rendu des tableaux/badges/pagination est traité par ITEM-012** (DataTable) :
  ne pas restyler le `<table>` ici. Si ITEM-012 est fait avant, cet item se limite
  aux en-têtes et formulaires ; s'il est fait après, laisser les tables inchangées.
- Rester sur shadcn/ui + Tailwind, primitives existantes ; texte FR / code EN.
- Ne pas modifier les server actions ni la logique d'accès : c'est une passe UI.

## Captures attendues
En-tête de page cohérent sur Utilisateurs et Invitations (dans le shell) ;
formulaires de création/édition/invitation restylés ; rendu mobile d'un en-tête et
d'un formulaire.

## Journal
- 2026-07-04 (backlog) — créé
- 2026-07-04 (backlog) — recentré : le tableau/badges/pagination passe à ITEM-012 (module DataTable). Cet item ne couvre plus que les en-têtes de page et les formulaires ; estimation ramenée de M à S.
- 2026-07-05 (implement) — démarrage
- 2026-07-05 (verify) — vérifié : revue OK (5/5 critères), types OK, lint OK, build OK. Aucune server action ni formulaire modifié (non-régression). Tables laissées à ITEM-012.
- 2026-07-05 (implement) — implémenté : composant `PageHeader` réutilisable (titre + description + actions + back link, responsive) appliqué aux pages Utilisateurs, Invitations, Nouvel utilisateur et Édition ; en-têtes unifiés, formulaires en `Card`/`CardContent` cohérents (messages d'erreur/succès déjà homogènes, inchangés). Aucune server action ni logique d'accès modifiée. Tables laissées à ITEM-012. Fichiers : components/admin/page-header.tsx, app/admin/users/page.tsx, app/admin/users/invitations/page.tsx, app/admin/users/new/page.tsx, app/admin/users/[id]/page.tsx
