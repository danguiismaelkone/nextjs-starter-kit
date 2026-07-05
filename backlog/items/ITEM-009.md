---
id: ITEM-009
title: Shell d'administration (sidebar + topbar, responsive)
status: verified
priority: P1
type: feature
estimate: M
depends_on: [ITEM-006]
created: 2026-07-04
updated: 2026-07-04
---

## Idée / contexte
Aujourd'hui les pages `/admin/*` sont des pages isolées (cartes centrées) sans
navigation partagée : rien ne « ressemble à une vraie console d'administration ».
Il manque une coquille (shell) commune : une barre latérale de navigation, une
barre supérieure avec l'utilisateur courant et la déconnexion, et un rendu
responsive. C'est le socle visuel qui accueillera le tableau de bord (ITEM-010)
et les pages restylées (ITEM-011).

## User story
En tant qu'administrateur, je veux une interface d'administration avec une
navigation latérale persistante et une barre supérieure, afin de me déplacer
facilement entre les sections et d'avoir une vraie impression de console d'admin.

## Critères d'acceptation
- [x] Un layout partagé `app/admin/layout.tsx` enveloppe toutes les pages `/admin/*` (protégé admin, ITEM-006).
- [x] Une **sidebar** liste les sections : Tableau de bord (`/admin`), Utilisateurs (`/admin/users`), Invitations (`/admin/users/invitations`).
- [x] L'élément de navigation **actif** est mis en évidence selon la route courante.
- [x] Une **topbar** affiche le nom/e-mail de l'admin courant et le bouton de déconnexion (réutiliser `LogoutButton`).
- [x] **Responsive** : sur mobile la sidebar se replie derrière un bouton (drawer/menu) ; sur desktop elle est visible en permanence.
- [x] Les pages existantes (`/admin/users`, `/admin/users/new`, `/admin/users/[id]`, `/admin/users/invitations`) s'affichent dans ce shell sans casser leurs fonctionnalités.
- [x] Aucune régression d'accès : un non-admin est toujours redirigé (le layout ou les pages conservent le garde `requireAdmin`).

## Notes techniques
- Le skill `app-shell` du projet génère précisément ce type de coquille
  (sidebar/rail shadcn/ui, état actif, responsive + drawer mobile, persistance
  du collapse) — l'utiliser comme point de départ puis l'adapter à `/admin`.
- Fichiers probables : `app/admin/layout.tsx`, `components/admin/admin-sidebar.tsx`,
  `components/admin/admin-topbar.tsx` (+ éventuel composant client pour le lien actif via `usePathname`).
- Réutiliser les primitives existantes (`Button`, `Card`) et les conventions
  (texte FR, code EN). Éviter d'introduire des dépendances lourdes si le skill
  `app-shell` suffit.
- Attention : le layout est un Server Component ; l'état actif/le drawer mobile
  nécessitent un petit composant client (`usePathname`, toggle d'ouverture).
- Hors-périmètre : thème clair/sombre, personnalisation de la nav par rôle,
  branding/logo avancé (peut faire l'objet d'items ultérieurs).

### Décisions prises
- **Shell fait main plutôt que le skill `app-shell`** : ce dernier est un
  générateur (4 variantes) qui tirerait des composants shadcn Sidebar/Sheet,
  alors que le repo assemble ses propres primitives légères (Select natif,
  tables maison) et qu'il fallait un garde serveur `requireAdmin` intégré au
  layout. Un shell minimal et bien intégré est plus cohérent et sans dépendance
  supplémentaire. Tokens `--sidebar*` déjà présents dans `globals.css` réutilisés.
- **Layout serveur** `app/admin/layout.tsx` : appelle `requireAdmin()` (garde de
  toute la section) et compose `AdminSidebar` (desktop) + `AdminTopbar` + `{children}`.
  Le layout n'introduit **pas** de `<main>` : les pages enfants conservent le leur
  (pas de double landmark). Les pages gardent aussi leur `requireAdmin` (ceinture+bretelles).
- **État actif** : logique « plus long préfixe » dans `AdminNav` (client, `usePathname`)
  pour que `/admin/users/invitations` surligne « Invitations » et non « Utilisateurs »,
  et `/admin` (exact) le tableau de bord.
- **Responsive** : sidebar `hidden md:flex` ; sur mobile, un drawer (radix `Dialog`
  en panneau latéral gauche) déclenché par un bouton menu dans la topbar, réutilisant
  le même `AdminNav` (fermeture au clic via `onNavigate`).
- **Hors-périmètre laissé tel quel** : la page `/admin` (carte centrée + bouton de
  déconnexion en doublon avec la topbar) sera remplacée par le tableau de bord
  (ITEM-010) ; les liens de navigation en doublon dans les pages seront nettoyés
  par ITEM-011. Aucune page existante n'a été modifiée (juste enveloppée).

## Captures attendues
Shell admin sur desktop (sidebar visible, section active mise en évidence, topbar
avec l'admin + déconnexion) ; version mobile avec la sidebar repliée puis ouverte
via le menu ; une page existante (ex. liste des utilisateurs) rendue dans le shell ;
(contrôle) un compte `user` est toujours redirigé hors de `/admin`.

## Journal
- 2026-07-04 (backlog) — créé
- 2026-07-04 (implement) — démarrage
- 2026-07-04 (implement) — implémenté : shell admin (layout serveur avec requireAdmin, sidebar desktop, topbar + drawer mobile, état actif par plus-long-préfixe). Shell fait main (pas app-shell). Fichiers : app/admin/layout.tsx, components/admin/admin-nav.tsx, components/admin/admin-sidebar.tsx, components/admin/admin-topbar.tsx
- 2026-07-04 (verify) — vérifié : revue OK (7/7 critères couverts), lint/types/build OK. Non bloquant : /admin garde un LogoutButton en doublon (→ ITEM-010) et les pages des liens de nav redondants (→ ITEM-011).
