---
id: ITEM-071
title: Navigation principale — relier les pages orphelines et enrichir le menu utilisateur
status: implemented
priority: P2
type: chore
estimate: S
depends_on: []
created: 2026-07-17
updated: 2026-07-17
---

## Idée / contexte
Inspiré d'une capture d'écran du menu utilisateur de Claude.ai (avatar en bas de
sidebar → menu déroulant groupé : Paramètres/Langue/Aide, puis
Facturation/Applications/Offrir/En savoir plus, puis Déconnexion), avec la demande
explicite de « faire le lien entre les différentes pages ».

Audit du code existant : plusieurs pages entièrement fonctionnelles ne sont
atteignables **par aucun lien** dans l'application — seulement en tapant l'URL à la
main :
- `/documents` (ITEM-027+) — absent de `AppSidebar.tsx#NAV_MAIN`.
- `/roles` (ITEM-018/019) — absent de toute navigation (page admin-only, non listée
  dans `NAV_ADMIN` aux côtés d'Utilisateurs/Invitations).
- `/billing` (ITEM-020+) — même constat, page admin-only également orpheline.
- `/docs` (documentation API publique, ITEM-053) — accessible sans authentification
  mais jamais liée depuis l'application connectée.

Le hub `/settings` (`app/(protected)/settings/page.tsx`) référence déjà Sécurité,
Organisation, Clés API, Webhooks et Journal d'audit — mais pas Rôles ni Facturation,
qui vivent hors de `/settings/*`.

## User story
En tant qu'utilisateur connecté, je veux atteindre toutes les fonctionnalités de
l'application (documents, rôles, facturation, documentation API) par un lien visible
dans l'interface, afin de ne pas dépendre de la connaissance préalable d'une URL.

## Critères d'acceptation
- [x] `/documents` apparaît dans `NAV_MAIN` de `AppSidebar.tsx` (visible par tout
      membre actif de l'organisation, comme Tableau de bord/Assistant IA).
- [x] `/roles` et `/billing` apparaissent dans le groupe « Administration » de la
      sidebar (`NAV_ADMIN`), visibles seulement si `canAccessAdmin` — cohérent avec
      leur garde d'accès existante (`requireAdmin()`/`hasPermission("admin","access")`,
      inchangée par cet item).
- [x] Le hub `/settings` référence désormais aussi Rôles et Facturation (mêmes
      conditions d'affichage que les entrées déjà présentes réservées aux
      owner/admin), pour rester le point d'entrée complet des réglages
      d'organisation même si ces deux pages vivent hors de `/settings/*`.
- [x] Le menu déroulant du profil (`NavUser.tsx`, bas de la sidebar) propose un accès
      direct à « Facturation » (`/billing`) et à la documentation API (`/docs`), en
      plus de Profil/Paramètres déjà présents — regroupés visuellement par un
      séparateur, avant l'entrée « Se déconnecter » (même schéma de groupement que
      la capture de référence).

## Notes techniques
Un module FATIHOUNE `app-shell` existe (`~/.claude/modules/_registry.json`) pour
générer une navigation sidebar/rail — **non pertinent ici** : la sidebar existe déjà
et fonctionne (`AppSidebar.tsx`, `NavUser.tsx`, `OrgSwitcher.tsx`), il s'agit
d'ajouter des entrées manquantes à une navigation existante, pas de la reconstruire.

Hors périmètre, volontairement écarté (pas inventé sans base dans le code) :
- **Sélecteur de langue** (visible dans la capture de référence) : ce projet n'a
  aucune infrastructure i18n (aucun texte n'est actuellement localisé au-delà du
  français en dur). L'ajouter demanderait une fondation i18n complète — hors
  périmètre de ce chore de navigation ; à cadrer comme item séparé si souhaité.
- **« Obtenir de l'aide »** de la capture n'a pas d'équivalent réel dans ce projet
  (pas de centre d'aide/support) : le lien ajouté ici vers `/docs` est nommé
  explicitement « Documentation API » plutôt que « Aide », pour ne pas laisser
  croire à un support utilisateur inexistant.
- **« Offrir Claude » / « Obtenir des applications »** : spécifiques au produit
  Claude.ai, sans équivalent pertinent dans ce SaaS — non repris.

Décisions à l'implémentation :
- **`NavUser.tsx` reçoit désormais `canAccessAdmin`** (nouvelle prop optionnelle,
  câblée depuis `AppSidebar.tsx` qui la possédait déjà) : l'entrée « Facturation » du
  menu déroulant n'est affichée que pour les owner/admin, cohérent avec la garde
  réelle de `/billing` (`hasPermission("admin","access")`, redirection sinon) — sans
  cette garde, un membre simple aurait vu un lien menant droit à une redirection
  silencieuse vers `/dashboard`. « Documentation API » (`/docs`), page publique sans
  garde, reste visible pour tout le monde.
- **`/settings` hub** : nouvelles entrées Rôles/Facturation insérées sous
  « Organisation » et avant « Clés API », sous la même condition `canManageOrg`
  (`role === "owner" || role === "admin"`) déjà utilisée par les entrées voisines —
  pas la garde RBAC `hasPermission` utilisée ailleurs, pour rester cohérent avec le
  reste de cette page précise (les deux sont équivalentes en pratique : les rôles
  système `owner`/`admin` sont les seuls jamais affectés à une `Membership.role`
  dans ce repo, ITEM-066 n'ayant construit que la création de rôles custom, pas
  leur affectation à un membre).
- Icônes : `FileText` (Documents), `ShieldCheck`/`CreditCard` (Rôles/Facturation,
  sidebar), `UserCog`/`CreditCard` (Rôles/Facturation, hub `/settings`), `BookText`
  (Documentation API) — choisies pour rester visuellement distinctes des icônes
  déjà utilisées sur la même page (`ShieldCheck` déjà pris par « Sécurité » sur le
  hub `/settings`, d'où `UserCog` pour « Rôles » à cet endroit précis).

Vérifications effectuées : `npx tsc --noEmit`, `npx eslint` (fichiers touchés), `npx
vitest run` (60 tests, inchangés — aucune logique testable ajoutée, uniquement de la
navigation), `npx next build`. Vérifié en conditions réelles via le serveur `next
dev` déjà lancé (port 3000) : connecté en tant qu'owner de l'organisation de démo,
`/settings` affiche bien Rôles et Facturation, `/dashboard` (sidebar) affiche bien
Documents (nav principale) et Rôles/Facturation (groupe Administration) avec les
bons `href`. Le contenu du menu déroulant `NavUser` (rendu par portail Radix,
seulement au clic) n'a pas pu être vérifié par simple requête HTTP — confirmé
indirectement via la charge utile RSC (`canAccessAdmin: true` transmis à `NavUser`
pour ce owner) ; vérification visuelle complète laissée à `backlog-test`.

Fichiers : `components/layout/AppSidebar.tsx`, `components/layout/NavUser.tsx`,
`app/(protected)/settings/page.tsx`.

## Captures attendues
Sidebar affichant Documents dans la navigation principale, et Rôles/Facturation dans
le groupe Administration ; hub `/settings` listant désormais Rôles et Facturation ;
menu déroulant du profil ouvert montrant Facturation et Documentation API groupés
avant Se déconnecter (et, pour un membre simple sans droits admin, le même menu
sans l'entrée Facturation).

## Journal
- 2026-07-17 (backlog) — créé, à partir d'une capture d'écran du menu utilisateur de
  Claude.ai et d'un audit du code confirmant que /documents, /roles, /billing et
  /docs ne sont reliés par aucun lien dans l'application.
- 2026-07-17 (implement) — démarrage
- 2026-07-17 (implement) — implémenté : `/documents` ajouté à la navigation
  principale, `/roles`/`/billing` au groupe Administration (sidebar), Rôles/
  Facturation ajoutés au hub `/settings`, menu déroulant du profil enrichi de
  Facturation (gardée owner/admin) et Documentation API. Fichiers :
  components/layout/AppSidebar.tsx, components/layout/NavUser.tsx,
  app/(protected)/settings/page.tsx.
