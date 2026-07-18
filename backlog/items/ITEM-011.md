---
id: ITEM-011
title: Ajouter un graphique d'activité dans le temps sur le dashboard
status: implemented
priority: P1
type: feature
estimate: S
depends_on: [ITEM-010]
created: 2026-07-15
updated: 2026-07-16
---

## Idée / contexte
La capture montre une carte "Volume de tokens" avec un graphique et un état
vide ("Aucune activité au cours des 7 derniers jours"). On veut le même
pattern générique : une carte graphique montrant l'évolution d'une métrique
dans le temps, avec un état vide propre quand il n'y a pas encore de données.

## User story
En tant qu'utilisateur connecté, je veux voir l'évolution de mon activité sur
une période récente, afin de repérer des tendances sans avoir à interpréter
des chiffres bruts.

## Critères d'acceptation
- [x] Une carte graphique (`ActivityChart`, Recharts `AreaChart` ou `LineChart`) s'affiche sous les cartes KPI, avec un sélecteur de période simple (ex. 7 / 30 jours).
- [x] Le graphique est responsive (`ResponsiveContainer`) et utilise les couleurs CSS des variables shadcn (cohérent en thème clair/sombre).
- [x] Quand il n'y a aucune donnée sur la période, un état vide explicite s'affiche (ex. "Aucune activité au cours des 7 derniers jours") à la place d'un graphique vide.
- [x] Un bouton d'action contextuel apparaît à côté du graphique quand il est vide (ex. "Essayer une action" — placeholder à adapter au métier réel).
- [x] Les données viennent de `lib/dashboard.ts` (`getChartData()`), pas de valeurs codées en dur.

## Notes techniques
- Réutiliser `UsersChart.tsx` / `RevenueChart.tsx` du module FATIHOUNE `dashboard` comme base, à renommer/adapter en `ActivityChart.tsx` générique.
- Fichiers : `components/dashboard/ActivityChart.tsx`, extension de `lib/dashboard.ts` (`getChartData()`).
- Dépendance npm : `recharts` (déjà requise par le module `dashboard`).

## Captures attendues
Carte graphique affichée avec des données de démo sur 7/30 jours ; bascule de période fonctionnelle ; état vide affiché correctement quand la période sélectionnée n'a aucune donnée.

## Journal
- 2026-07-15 (backlog) — créé
- 2026-07-15 (implement) — démarrage
- 2026-07-16 (implement) — implémenté : `ActivityChart` (AreaChart Recharts, sélecteur 7/30 j, état vide + bouton placeholder) branché sur `getChartData()` et affiché sur le dashboard. Fichiers : components/dashboard/ActivityChart.tsx, lib/dashboard.ts, app/(protected)/dashboard/page.tsx, app/(protected)/dashboard/loading.tsx. Typecheck (`tsc --noEmit`) et lint OK.
