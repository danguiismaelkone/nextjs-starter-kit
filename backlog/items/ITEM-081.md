---
id: ITEM-081
title: CategoryStatCards — la grille remplit toute la ligne quel que soit le nombre de catégories
status: implemented
priority: P3
type: bug
estimate: S
depends_on: [ITEM-077]
created: 2026-07-18
updated: 2026-07-18
---

## Idée / contexte
Capture d'écran : sur `/admin/users` (3 catégories — Tout/Actifs/Désactivés), la
grille de `CategoryStatCards` (ITEM-077) est fixée à `sm:grid-cols-2 lg:grid-cols-4`.
Avec 3 stats sur un écran large, la 4ᵉ colonne reste vide et les 3 cartes
n'occupent pas toute la largeur de la ligne — au lieu de se répartir pour la
remplir. Le même composant est aussi utilisé sur `/admin/invitations` (3
catégories) : le correctif doit rester générique, pas un cas particulier codé en
dur pour 3.

## User story
En tant qu'utilisateur de l'admin, je veux que les cartes de statistiques
occupent toute la largeur de leur ligne quel que soit le nombre de catégories,
afin que l'interface ne laisse pas d'espace vide inutile.

## Critères d'acceptation
- [x] Avec 3 catégories (`/admin/users`, `/admin/invitations`), les 3 cartes se
      répartissent sur toute la largeur disponible sur desktop (pas de 4ᵉ
      emplacement vide).
- [x] Le nombre de colonnes s'adapte au nombre réel d'éléments de `stats`
      (2, 3, 4, 5… colonnes), sans valeur figée à 4 dans le composant.
- [x] Le comportement responsive existant est conservé (empilement sur mobile,
      pas de régression sur tablette).
- [ ] Vérifié visuellement sur les deux pages consommant `CategoryStatCards`
      (`/admin/users`, `/admin/invitations`) — non couvert ici (pages derrière
      auth, dev server existant non perturbé), laissé à `backlog-test`.

## Notes techniques
Fichier concerné : `components/crud/CategoryStatCards.tsx` — grille actuelle
`className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"` (ligne 50), indépendante
de `stats.length`. Piste : dériver la classe/colonnes de `stats.length` (ex.
map vers un nombre de colonnes plafonné, ou `gridTemplateColumns:
repeat(stats.length, minmax(0, 1fr))` inline pour le palier desktop) plutôt
qu'une valeur `lg:grid-cols-4` fixe, tout en gardant l'empilement mobile
(`grid-cols-1`/`sm:grid-cols-2`) pour les petits écrans.

Pas de module FATIHOUNE dédié — composant maison introduit par ITEM-077.

Décision à l'implémentation : plutôt qu'un mapping statique `{1: "lg:grid-cols-1", ...}`
(fragile, plafonné arbitrairement), colonnes desktop dérivées de `stats.length` via
une variable CSS (`style={{ "--stat-cols": stats.length }}`) consommée par une classe
Tailwind arbitraire `lg:grid-cols-[repeat(var(--stat-cols),minmax(0,1fr))]` — Tailwind
v4 (déjà utilisé par le projet) supporte les `var()` dans les valeurs arbitraires, donc
la classe reste statique dans le code source (détectée au build) alors que le nombre
de colonnes est réellement dynamique. `sm:grid-cols-2` (tablette) et l'empilement
mobile par défaut restent inchangés.

## Captures attendues
`/admin/users` (ou `/admin/invitations`) avant/après : les 3 cartes de
statistiques occupant toute la largeur de la ligne sur desktop, sans colonne
vide.

## Journal
- 2026-07-18 (backlog) — créé à partir d'une capture d'écran montrant un espace
  vide dans la grille `CategoryStatCards` (ITEM-077) sur `/admin/users`.
- 2026-07-18 (implement) — démarrage
- 2026-07-18 (implement) — implémenté : `components/crud/CategoryStatCards.tsx`
  (grille desktop dynamique via variable CSS `--stat-cols` + classe Tailwind
  arbitraire, au lieu de `lg:grid-cols-4` figé). `npx tsc --noEmit` et `npx eslint
  components/crud/CategoryStatCards.tsx` OK. Vérification visuelle en navigateur
  (pages derrière auth) laissée à `backlog-test`.
