---
id: ITEM-082
title: Refonte du hub /settings — page de paramètres groupée en catégories (grille de cartes)
status: implemented
priority: P2
type: feature
estimate: M
depends_on: [ITEM-038, ITEM-071]
created: 2026-07-18
updated: 2026-07-18
---

## Idée / contexte
Capture d'écran de référence (hub de paramètres d'un SaaS tiers) : les réglages
sont groupés sous des titres de section en gras (« Paramètres personnels »,
« Paramètres du compte », « Paramètres produit »), chaque entrée étant une carte
cliquable icône + titre + description, en grille multi-colonnes.

Le hub `/settings` actuel (`app/(protected)/settings/page.tsx`, livré par
ITEM-038 puis enrichi par ITEM-071) est une simple liste verticale de liens dans
une unique `Card`, sans regroupement visuel. Cet item **reprend la mise en page**
de la capture (sections + grille de cartes), **sans ajouter de fonctionnalité
inexistante** : seules les pages qui existent déjà dans ce projet doivent
apparaître (contrairement à la capture de référence, dont plusieurs entrées —
Radar, Sigma, Identity, Financial Connections, Managed Payments, Data Pipeline,
« Découvrir d'autres fonctionnalités » — sont spécifiques à Stripe et n'ont pas
d'équivalent ici : ne pas les reproduire).

Pages existantes déjà identifiées comme candidates (à confirmer/filtrer selon
les droits de l'utilisateur courant à l'implémentation) :
- `/profile` (Informations personnelles)
- `/settings/security` (Sécurité — 2FA, sessions actives)
- `/settings/organizations/[id]` (Organisation)
- `/settings/organizations/[id]/branding` (Branding, si le white-label est actif)
- `/settings/organizations/[id]/domain` (Domaine personnalisé, si white-label actif)
- `/settings/organizations/[id]/sso` (Connexion SSO, si Enterprise actif)
- `/roles` (Rôles)
- `/admin/users` (Membres de l'organisation)
- `/admin/invitations` (Invitations)
- `/settings/api-keys` (Clés API)
- `/settings/webhooks` (Webhooks)
- `/settings/audit` (Journal d'audit)
- `/billing` (Facturation)
- `/billing/invoices` (Factures)
- `/billing/plans` (Tarifs)
- Préférences de notification (actuellement une section inline sur `/settings`,
  `NotificationSection` — pas une route dédiée)

## User story
En tant qu'utilisateur (ou administrateur d'organisation), je veux une page
`/settings` organisée en catégories claires avec des cartes cliquables (icône +
titre + description), afin de retrouver rapidement le réglage recherché parmi
un nombre croissant de pages de paramètres.

## Critères d'acceptation
- [x] `/settings` affiche les entrées regroupées sous des titres de section
      visuellement distincts (au moins « Paramètres personnels » et
      « Paramètres du compte » ; « Paramètres produit » seulement si des
      entrées existantes justifient une 3ᵉ section).
- [x] Chaque entrée est une carte cliquable avec icône + titre + description
      d'une ligne, cohérente avec les icônes/libellés déjà utilisés ailleurs
      dans l'app pour cette page (ex. `ShieldCheck` pour Sécurité, `Building2`
      pour Organisation — voir liste dans `## Idée / contexte`).
- [x] Chaque section utilise une grille responsive multi-colonnes sur desktop
      (empilement sur mobile) — pas de liste verticale à une seule colonne.
- [x] Chaque carte pointe vers une page qui **existe réellement** dans le
      projet : aucune carte n'est ajoutée pour un concept sans page
      correspondante (pas de placeholder, pas de lien mort).
- [x] Le contrôle d'accès actuel est préservé à l'identique : une carte vers
      une page réservée (organisation, facturation, clés API, webhooks, audit,
      admin, SSO/branding/domaine white-label…) n'apparaît que si l'utilisateur
      courant a effectivement le droit d'accéder à cette page (même logique de
      garde que le code actuel, ex. `canManageOrg`, gates white-label/Enterprise).
- [x] Les préférences de notification restent atteignables depuis `/settings`
      après la refonte (en section inline conservée, ou en carte dédiée reliée
      à cette section — au choix de l'implémentation, du moment que rien n'est
      perdu par rapport à l'existant).
- [x] Aucune régression sur les pages de destination elles-mêmes (cet item ne
      touche que la page `/settings`, pas le contenu des pages liées).

## Notes techniques
Fichier concerné : `app/(protected)/settings/page.tsx` (Server Component,
`getSession`/`getCurrentOrganization`/`getNotificationPreferences` déjà en
place). Réutiliser les icônes déjà importées (`Building2`, `CreditCard`,
`KeyRound`, `ScrollText`, `ShieldCheck`, `UserCog`, `Webhook`) et en ajouter au
besoin (`lucide-react`) pour les nouvelles entrées (profil, membres,
invitations, factures, tarifs, branding, domaine, SSO).

Pour la grille responsive, s'inspirer du pattern déjà validé par ITEM-081
(`components/crud/CategoryStatCards.tsx` : colonnes desktop dérivées du nombre
d'éléments via variable CSS + classe Tailwind arbitraire) plutôt que de
réinventer un système de grille — mais un composant de carte de navigation
(icône + titre + description cliquable) est différent d'une carte de
statistique (compteur) : ne pas réutiliser `CategoryStatCards` tel quel,
introduire un composant dédié si besoin (ex. `components/settings/SettingsLinkCard.tsx`),
sans sur-ingénierie si un seul fichier suffit.

Vérifier à l'implémentation, pour chaque candidate de la liste ci-dessus, la
garde d'accès exacte déjà utilisée par la page cible elle-même (ex. gate
white-label pour branding/domaine, gate Enterprise pour SSO/audit,
`canAccessAdmin`/`canManageOrg` pour admin/organisation/facturation) plutôt que
de deviner une nouvelle condition : la carte doit disparaître exactement quand
la page cible refuserait l'accès.

Pas de module FATIHOUNE dédié à ce gabarit précis (composant maison, cohérent
avec l'approche d'ITEM-077 pour les autres gabarits de page de ce projet).

Décisions à l'implémentation :
- **Deux nouveaux composants dédiés** (`components/settings/SettingsLinkCard.tsx`,
  `components/settings/SettingsSection.tsx`) plutôt que de réutiliser
  `CategoryStatCards` — une carte de navigation (icône + titre + description
  cliquable) est un objet différent d'une carte de statistique (compteur), et
  les deux évoluent indépendamment.
- ~~Colonnes desktop plafonnées à `min(count, 3)`~~ — **remplacé** suite à une
  demande explicite de l'utilisateur après implémentation : la grille du hub
  `/settings` est maintenant à **3 colonnes fixes** sur desktop
  (`lg:grid-cols-3`, sans variable CSS/`count`), chaque carte gardant une
  taille fixe (1/3 de la ligne) **même seule sur sa ligne** (pas d'étirement
  pour combler l'espace restant) — y compris pour la section « Paramètres
  personnels » (2 cartes), qui laisse donc désormais un emplacement vide sur
  sa ligne plutôt que d'étirer ses 2 cartes en 2 colonnes. Ce comportement est
  volontairement différent de celui de `CategoryStatCards` (ITEM-081), qui
  reste inchangé : la préférence pour une taille de carte fixe l'emporte ici
  sur le remplissage de ligne. `SettingsSection` n'a donc plus de prop `count`.
- **Préférences de notification laissées en section inline** sous les grilles
  (comportement inchangé de `NotificationSection`), pas transformées en carte
  cliquable : elles n'ont pas de route dédiée dans ce projet, et une carte qui
  ne ferait que faire défiler la même page apporterait peu de valeur.
- **Gating uniforme via `canManageOrg`** (`organization.role === "owner" |
  "admin"`) pour toutes les nouvelles cartes « compte »/« produit »
  (Branding, Domaine, SSO, Membres, Invitations, Factures, Tarifs) — même
  garde que celle déjà utilisée dans ce hub pour Organisation/Rôles/
  Facturation/Clés API/Webhooks/Journal d'audit avant cet item. Les pages de
  destination elles-mêmes gèrent déjà leurs propres restrictions plus fines
  (ex. `isWhiteLabelOrganization`/`isEnterpriseOrganization` pour
  Branding/Domaine/SSO/Audit, permission RBAC `admin:access` via
  `requireAdmin()` pour Membres/Invitations/Audit) en affichant un message
  d'upsell plutôt qu'en bloquant l'accès à la page — aucune de ces pages ne
  redirige un owner/admin non entitled, donc afficher la carte pour tout
  owner/admin de l'organisation ne crée pas de lien mort.

Fichiers modifiés : `app/(protected)/settings/page.tsx` (réécrit),
`components/settings/SettingsLinkCard.tsx` (nouveau),
`components/settings/SettingsSection.tsx` (nouveau).
`npx tsc --noEmit` et `npx eslint` (fichiers touchés) OK.

## Captures attendues
`/settings` pour un compte owner/admin (3 sections visibles : Paramètres
personnels — 2 cartes ; Paramètres du compte — 7 cartes ; Paramètres produit —
6 cartes) et pour un compte utilisateur simple (seule la section Paramètres
personnels, les deux autres masquées) — démontrant le regroupement en
sections et la grille à 3 colonnes fixes (cartes de taille fixe, y compris la
section « Paramètres personnels » à 2 cartes qui laisse désormais un
emplacement vide plutôt que d'étirer ses cartes).

## Journal
- 2026-07-18 (backlog) — créé à partir d'une capture d'écran de référence (hub
  de paramètres groupé en catégories) ; périmètre volontairement restreint aux
  pages déjà existantes du projet, à l'exclusion des entrées spécifiques à la
  capture (Stripe) sans équivalent ici.
- 2026-07-18 (implement) — démarrage
- 2026-07-18 (implement) — implémenté : `/settings` réécrit en 3 sections
  (Paramètres personnels/du compte/produit), nouveaux composants
  `SettingsLinkCard`/`SettingsSection` (grille dynamique plafonnée à 3
  colonnes). Fichiers : `app/(protected)/settings/page.tsx`,
  `components/settings/SettingsLinkCard.tsx`,
  `components/settings/SettingsSection.tsx`. `tsc --noEmit` et `eslint` OK.
  Vérification visuelle en navigateur (pages derrière auth) laissée à
  `backlog-test`.
- 2026-07-18 (implement) — ajustement demandé directement par l'utilisateur :
  grille du hub passée de colonnes dynamiques (`min(count, 3)`) à 3 colonnes
  fixes, cartes de taille fixe (1/3 de ligne) même seules sur leur ligne.
  `SettingsSection` perd sa prop `count`. Fichiers :
  `components/settings/SettingsSection.tsx`,
  `app/(protected)/settings/page.tsx`. `tsc --noEmit` et `eslint` OK.
- 2026-07-18 (implement) — ajout demandé directement par l'utilisateur : carte
  « Préférences en matière de communication » (icône `Mail`) dans la section
  « Paramètres du compte », pointant vers `/settings#notifications` (ancre
  ajoutée sur la section `NotificationSection` déjà inline sur cette même
  page). Description adaptée aux canaux réellement supportés par ce projet
  (e-mail/push/in-app — pas de SMS, absent de `NotificationChannel`), plutôt
  que reprise telle quelle de la capture de référence qui mentionne un canal
  SMS inexistant ici. Fichier : `app/(protected)/settings/page.tsx`.
- 2026-07-18 (implement) — demande directe de l'utilisateur : la section
  Notifications quitte `/settings` pour devenir sa propre page,
  `/settings/notifications` (nouveau fichier
  `app/(protected)/settings/notifications/page.tsx`, réutilise le composant
  `NotificationSection` existant tel quel, lien de retour « ← Paramètres »).
  Retiré de `/settings/page.tsx` : import de `NotificationSection`/
  `getNotificationPreferences`, ancre `#notifications`. La carte
  « Préférences en matière de communication » pointe désormais vers
  `/settings/notifications` au lieu d'une ancre sur la même page. Pas de
  fabrication des onglets Compte/Transactions/API/Comptes connectés de la
  capture de référence (Stripe) : ce projet n'a que 2 catégories de
  notification (`account_security`, `organization`), pas de structure à
  onglets sous-jacente à reproduire. `tsc --noEmit` et `eslint` OK.
