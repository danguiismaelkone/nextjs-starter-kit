---
id: ITEM-009
title: Mettre en place le shell de navigation applicative (sidebar)
status: implemented
priority: P0
type: feature
estimate: M
depends_on: [ITEM-001]
created: 2026-07-15
updated: 2026-07-15
---

## Idée / contexte
On veut reproduire la structure de la Claude Console pour l'espace connecté :
une sidebar de navigation collapsible (icônes + texte / icônes seules), un
header léger, et un menu utilisateur en pied de sidebar. C'est le squelette
commun à toutes les pages de l'espace connecté (dashboard et pages futures).

## User story
En tant qu'utilisateur connecté, je veux une navigation latérale claire et
repliable, afin de me déplacer facilement entre les sections de l'application
sans perdre de repères visuels.

## Critères d'acceptation
- [x] Une sidebar shadcn/ui (`components/layout/AppSidebar.tsx`) liste les sections de navigation, avec l'item actif surligné selon l'URL courante.
- [x] La sidebar est collapsible (icônes + texte ↔ icônes seules) et l'état replié est persisté (cookie ou localStorage).
- [x] Sur mobile, la navigation s'ouvre en drawer (panneau latéral) au lieu de rester fixe.
- [x] Un menu utilisateur en pied de sidebar (`NavUser`) affiche l'utilisateur connecté et propose "Profil", "Paramètres", "Se déconnecter".
- [x] Le layout protégé (`app/(protected)/layout.tsx` ou équivalent) redirige vers `/login` si aucune session (via `getSession()` d'ITEM-001).
- [x] Aucune erreur `Tooltip must be used within TooltipProvider` (TooltipProvider posé à la racine si nécessaire par le composant sidebar shadcn).

## Notes techniques
- Réutiliser le module FATIHOUNE **`dashboard`** (stack `nextjs`) via `/module:add dashboard` : il génère déjà `AppSidebar.tsx`, `NavUser.tsx` et le layout protégé avec `SidebarProvider`. Ignorer/retirer la partie `OrgSwitcher` (multi-tenant) : ce projet gère uniquement des rôles user/admin (ITEM-006), pas d'organisations multiples.
- Alternative si on veut uniquement le squelette de nav sans les KPI/queries : skill `app-shell` (4 variantes de rail/sidebar), à combiner ensuite avec ITEM-010.
- Commande shadcn requise : `npx shadcn@latest add sidebar`.
- Items de navigation adaptés au rôle (admin vs user) : brancher sur ITEM-006 une fois les rôles en place (peut rester statique en attendant).
- Hors-périmètre : contenu des pages liées (Clés API, Agents, Analytique... — non repris, cf. décision de cadrage), uniquement le shell + la page dashboard (ITEM-010).

### Décisions prises à l'implémentation
- Fichiers du module `dashboard` (nextjs) repris comme base pour `AppSidebar.tsx`, `NavUser.tsx` et `app/(protected)/layout.tsx`, puis élagués : suppression d'`OrgSwitcher`, `tenants`/`tenantId`/`isOrgOwner`, `ImpersonationBanner`, `NotificationBell`, `ThemeToggle` et du lien "Facturation" — aucun de ces modules (multi-tenant, notifications, thème, billing) n'existe dans ce projet.
- `getSession()` importé depuis `@/lib/auth` (ITEM-001), pas `@/lib/session` comme dans le module d'origine.
- Nav principale réduite à "Tableau de bord" ; section "Administration" (`Utilisateurs`) affichée seulement si `session.user.role === "admin"` — statique en attendant ITEM-006 (le champ `role` n'existe pas encore sur le modèle `User`, donc la section est masquée pour l'instant, comme prévu par la note ci-dessus).
- `SidebarProvider` ne fournit pas de `TooltipProvider` propre (vérifié dans `components/ui/sidebar.tsx` généré) : `TooltipProvider` ajouté à la racine (`app/layout.tsx`), autour de `{children}`.
- État replié persisté via le cookie `sidebar_state` posé par le composant shadcn ; `app/(protected)/layout.tsx` lit ce cookie côté serveur (`cookies()`) pour initialiser `defaultOpen` et éviter un flash au chargement.
- Page `app/(protected)/dashboard/page.tsx` ajoutée en simple stub (titre seulement) pour que la route existe et que le shell soit navigable ; le contenu KPI reste hors-périmètre (ITEM-010).
- Composants shadcn installés : `sidebar`, `avatar`, `dropdown-menu` (+ dépendances auto : `tooltip`, `sheet`, `separator`, `skeleton`, `input`, `hooks/use-mobile.ts`).
- En-tête de sidebar restylé (2026-07-15, sur demande) pour se rapprocher visuellement de la Claude Console : titre en `font-serif` à gauche, icône de recherche (décorative, pas de fonctionnalité de recherche implémentée) + `SidebarTrigger` à droite. Le `SidebarTrigger` du header principal (`app/(protected)/layout.tsx`) est conservé tel quel : c'est le seul moyen d'ouvrir le drawer sur mobile quand la sidebar est fermée.

## Captures attendues
Sidebar visible avec item actif surligné ; bascule repliée/dépliée fonctionnelle ; drawer mobile ; menu utilisateur ouvert avec "Se déconnecter" ; redirection vers `/login` si non connecté.

## Journal
- 2026-07-15 (backlog) — créé
- 2026-07-15 (implement) — démarrage
- 2026-07-15 (implement) — implémenté : sidebar shadcn/ui collapsible avec persistance cookie, drawer mobile natif, NavUser (Profil/Paramètres/Se déconnecter), layout protégé avec redirection /login, TooltipProvider à la racine. Base reprise du module FATIHOUNE `dashboard` (nextjs), élaguée du multi-tenant/notifications/billing hors-scope. Fichiers : app/layout.tsx, app/(protected)/layout.tsx, app/(protected)/dashboard/page.tsx, components/layout/AppSidebar.tsx, components/layout/NavUser.tsx, components/ui/{sidebar,avatar,dropdown-menu,tooltip,sheet,separator,skeleton,input}.tsx, hooks/use-mobile.ts. Vérifié : tsc --noEmit, lint, build OK ; redirection /dashboard → /login confirmée en dev (307) sans session.
- 2026-07-15 (implement) — retouche visuelle demandée par l'utilisateur : en-tête de sidebar (`components/layout/AppSidebar.tsx`) restylé pour matcher une capture d'écran de référence (titre serif + icônes recherche/toggle). Vérifié visuellement via Playwright (capture d'écran, états déplié et replié) sur un utilisateur connecté réel.
