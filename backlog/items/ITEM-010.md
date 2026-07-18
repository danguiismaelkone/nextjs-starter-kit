---
id: ITEM-010
title: Créer la page d'accueil du dashboard avec cartes de statistiques (KPI)
status: implemented
priority: P0
type: feature
estimate: M
depends_on: [ITEM-009]
created: 2026-07-15
updated: 2026-07-15
---

## Idée / contexte
Sur la capture Claude Console, la page d'accueil affiche un message de
bienvenue personnalisé, des actions rapides, et une rangée de cartes de
statistiques (crédits, dépenses, cache). On veut l'équivalent générique pour
un dashboard SaaS : accueil personnalisé + cartes KPI, avec un contenu
placeholder qui sera affiné plus tard selon le métier réel du produit.

## User story
En tant qu'utilisateur connecté, je veux arriver sur une page d'accueil qui me
salue et me montre en un coup d'œil mes statistiques clés, afin de comprendre
rapidement l'état de mon compte/activité.

## Critères d'acceptation
- [x] La page `/dashboard` affiche un en-tête avec salutation personnalisée ("Bonjour, {prénom}") et 1-2 boutons d'action rapide (placeholder, ex. "Créer", "Inviter").
- [x] Une grille responsive (`KpiGrid`) de 3 cartes de statistiques (`KpiCard`) s'affiche : chaque carte a un libellé, une valeur, et un état vide clair ("—" / "aucune activité") quand la donnée n'existe pas encore.
- [x] Les données des cartes viennent d'une fonction serveur (`lib/dashboard.ts` → `getStats()`), pas de données codées en dur dans le JSX.
- [x] La page est un Server Component ; un `loading.tsx` (skeletons) s'affiche pendant le chargement.
- [x] La page est protégée : redirection vers `/login` si pas de session (via le layout d'ITEM-009).

## Notes techniques
- Réutiliser le module FATIHOUNE **`dashboard`** (déjà ajouté pour ITEM-009) : il fournit `KpiCard.tsx`, `KpiGrid.tsx` et `lib/dashboard.ts` (`getStats()`). Adapter les 3 KPI par défaut au métier réel du produit une fois défini (pour l'instant : placeholders génériques, ex. "Utilisateurs", "Activité ce mois", "Statut du compte").
- Fichiers : `app/(protected)/dashboard/page.tsx`, `app/(protected)/dashboard/loading.tsx`, `components/dashboard/KpiCard.tsx`, `components/dashboard/KpiGrid.tsx`, `lib/dashboard.ts`.
- Hors-périmètre : graphique temporel (ITEM-011), section ressources/liens (ITEM-012).

### Décisions prises à l'implémentation
- **`lib/dashboard.ts` du module FATIHOUNE réécrit plutôt que repris tel quel** : la version du module interroge `prisma.subscription`, `prisma.invoice`, `prisma.plan` — des modèles multi-tenant/billing qui n'existent pas dans ce schéma (hors-périmètre depuis ITEM-009). `getStats()` recalculé à partir des seules données réelles disponibles : `User` (total, nouveaux ce mois) et une 3ᵉ carte volontairement vide (`recentActivityCount: null`) car aucune fonctionnalité de suivi d'activité n'existe encore dans le produit — pas un simple "0", un vrai état vide testable, ce qui exerce concrètement le critère "état vide clair" plutôt que de le laisser être du code mort jamais atteint.
- KPIs retenus : "Utilisateurs" (total), "Nouveaux ce mois" (créés depuis le 1ᵉʳ du mois), "Activité récente" (placeholder `null` → affiche "—" / "Aucune activité pour l'instant").
- `KpiCard.tsx` réécrit en plus simple que la version du module (pas de `change`/flèche de tendance : aucune des 3 métriques actuelles n'a de comparaison historique pertinente à ce stade) ; accepte `value: number | string | null` et bascule automatiquement sur l'état vide si `null`/`undefined`.
- Boutons "Créer"/"Inviter" rendus `disabled` (pas des liens morts cliquables sans effet) : ce sont des placeholders explicitement hors-périmètre métier selon l'idée/contexte de l'item — un futur item pourra les câbler (ex. "Inviter" pourrait pointer vers `/admin/invitations` d'ITEM-008 une fois le rôle pris en compte pour l'affichage conditionnel).
- Salutation : prénom extrait de `session.user.name.split(" ")[0]`, avec repli sur "vous" si le nom est vide.
- Page protégée à double niveau (comme les autres pages `(protected)`) : le layout d'ITEM-009 protège déjà toute la section, la page revérifie quand même la session pour accéder proprement à `session.user.name` sans la faire transiter par les props du layout.
- Vérifié en conditions réelles (Playwright, admin connecté réel avec 16 utilisateurs en base) : "Bonjour, Admin" affiché, 16/16 sur les deux premières cartes (cohérent, tous les comptes de test ont été créés aujourd'hui), troisième carte affichant bien "—" / "Aucune activité pour l'instant", aucune erreur console. `GET /dashboard` sans session → 307 vers `/login`. `tsc --noEmit`, lint, `pnpm build` OK.

## Captures attendues
Page `/dashboard` avec salutation, boutons d'action, et 3 cartes KPI affichées (avec valeurs ou état vide) ; skeleton visible brièvement au chargement.

## Journal
- 2026-07-15 (backlog) — créé
- 2026-07-15 (implement) — démarrage
- 2026-07-15 (implement) — implémenté : page `/dashboard` avec salutation personnalisée, boutons d'action placeholder désactivés, grille de 3 KPI (Utilisateurs, Nouveaux ce mois, Activité récente en état vide) calculés côté serveur via `lib/dashboard.ts`, `loading.tsx` avec skeletons. Fichiers : lib/dashboard.ts, components/dashboard/{KpiCard.tsx,KpiGrid.tsx}, app/(protected)/dashboard/{page.tsx,loading.tsx}. Vérifié en conditions réelles (Playwright, admin connecté) + redirection /login sans session + tsc/lint/build.
