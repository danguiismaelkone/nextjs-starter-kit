# Backlog

> Convention : voir [README.md](./README.md). Statuts : todo → in-progress → implemented → verified → tested → done (ou blocked).
> Contexte : Next.js 16 · Prisma 7 (PostgreSQL) · **Better Auth** · multi-tenant (Organizations) · Stripe · S3-compatible · Resend · Firebase · Docker.
> Ce backlog vise un **SaaS Core** réutilisable (voir `## Contexte projet` dans le README) : fondation Auth/Users déjà livrée, puis Organizations, Billing, Documents, Notifications, IA, Paramètres, Admin, API, Sécurité, Tests, Performance, Monitoring, Déploiement, Enterprise, White Label.

## Fondation Auth & Users (livrée)

| ID | Titre | Type | Prio | Statut | Dépend de |
|----|-------|------|------|--------|-----------|
| [ITEM-001](items/ITEM-001.md) | Fondation d'authentification (Better Auth + Prisma) | feature | P0 | implemented | — |
| [ITEM-002](items/ITEM-002.md) | Page d'enregistrement (sign-up self-service) | feature | P0 | implemented | ITEM-001 |
| [ITEM-003](items/ITEM-003.md) | Page de login | feature | P0 | implemented | ITEM-001 |
| [ITEM-005](items/ITEM-005.md) | Envoi d'e-mails transactionnels (Resend) | feature | P1 | implemented | ITEM-001 |
| [ITEM-006](items/ITEM-006.md) | Rôles (user/admin) et contrôle d'accès | feature | P1 | implemented | ITEM-001 |
| [ITEM-004](items/ITEM-004.md) | Réinitialisation du mot de passe | feature | P1 | implemented | ITEM-001, ITEM-005 |
| [ITEM-007](items/ITEM-007.md) | CRUD des utilisateurs (admin) | feature | P1 | implemented | ITEM-001, ITEM-006 |
| [ITEM-008](items/ITEM-008.md) | Invitation d'utilisateurs (envoi + acceptation) | feature | P2 | implemented | ITEM-001, ITEM-005, ITEM-006 |
| [ITEM-009](items/ITEM-009.md) | Shell de navigation applicative (sidebar) | feature | P0 | implemented | ITEM-001 |
| [ITEM-010](items/ITEM-010.md) | Page d'accueil dashboard — cartes de statistiques (KPI) | feature | P0 | implemented | ITEM-009 |
| [ITEM-011](items/ITEM-011.md) | Graphique d'activité dans le temps | feature | P1 | implemented | ITEM-010 |
| [ITEM-012](items/ITEM-012.md) | Sections de cartes secondaires (mise en avant + ressources) | feature | P2 | implemented | ITEM-010 |

## Épic A — Organizations & multi-tenancy

| ID | Titre | Type | Prio | Statut | Dépend de |
|----|-------|------|------|--------|-----------|
| [ITEM-013](items/ITEM-013.md) | Modèle de données Organization + Membership (multi-tenant) | feature | P0 | verified | ITEM-001 |
| [ITEM-014](items/ITEM-014.md) | Onboarding — création d'organisation à l'inscription | feature | P0 | verified | ITEM-013, ITEM-002 |
| [ITEM-015](items/ITEM-015.md) | Sélecteur d'organisation (switch tenant) | feature | P0 | verified | ITEM-013, ITEM-009 |
| [ITEM-016](items/ITEM-016.md) | Membres d'organisation — rôles et invitations scoped à l'org | feature | P0 | implemented | ITEM-013, ITEM-006, ITEM-008 |
| [ITEM-017](items/ITEM-017.md) | Page paramètres d'organisation (infos, logo, slug) | feature | P1 | implemented | ITEM-013 |

## Épic B — RBAC avancé

| ID | Titre | Type | Prio | Statut | Dépend de |
|----|-------|------|------|--------|-----------|
| [ITEM-018](items/ITEM-018.md) | Modèle Role/Permission dynamique (RBAC avancé) | feature | P1 | implemented | ITEM-013 |
| [ITEM-019](items/ITEM-019.md) | Matrice de permissions + guards d'accès (UI admin) | feature | P1 | implemented | ITEM-018 |

## Épic C — Billing (Stripe)

| ID | Titre | Type | Prio | Statut | Dépend de |
|----|-------|------|------|--------|-----------|
| [ITEM-020](items/ITEM-020.md) | Modèles Plan/Subscription/Invoice (Prisma) | feature | P0 | implemented | ITEM-013 |
| [ITEM-021](items/ITEM-021.md) | Intégration Stripe Checkout (souscription à un plan) | feature | P0 | implemented | ITEM-020 |
| [ITEM-022](items/ITEM-022.md) | Webhooks Stripe — synchronisation des abonnements et factures | feature | P0 | implemented | ITEM-021 |
| [ITEM-023](items/ITEM-023.md) | Page Facturation (plan actuel, factures, moyen de paiement) | feature | P1 | implemented | ITEM-021 |
| [ITEM-024](items/ITEM-024.md) | Essai gratuit et upgrade/downgrade de plan | feature | P1 | implemented | ITEM-021 |
| [ITEM-025](items/ITEM-025.md) | Coupons et codes promo | feature | P2 | implemented | ITEM-021 |
| [ITEM-026](items/ITEM-026.md) | Annulation et résiliation d'abonnement | feature | P1 | implemented | ITEM-021 |
| [ITEM-091](items/ITEM-091.md) | Page /billing — lien manquant pour changer de plan une fois abonné (y compris en essai) | bug | P1 | implemented | ITEM-023, ITEM-024 |

## Épic D — Documents

| ID | Titre | Type | Prio | Statut | Dépend de |
|----|-------|------|------|--------|-----------|
| [ITEM-027](items/ITEM-027.md) | Configuration du stockage S3-compatible (MinIO/R2/S3) | feature | P1 | implemented | ITEM-013 |
| [ITEM-028](items/ITEM-028.md) | Modèle Document/Folder + upload de fichiers | feature | P1 | implemented | ITEM-027 |
| [ITEM-029](items/ITEM-029.md) | Arborescence de dossiers et navigation | feature | P1 | implemented | ITEM-028 |
| [ITEM-030](items/ITEM-030.md) | Téléchargement et prévisualisation de documents | feature | P1 | implemented | ITEM-028 |
| [ITEM-031](items/ITEM-031.md) | Versionning des documents | feature | P2 | implemented | ITEM-028 |
| [ITEM-032](items/ITEM-032.md) | Corbeille (suppression douce + restauration) | feature | P2 | implemented | ITEM-028 |
| [ITEM-033](items/ITEM-033.md) | Partage de documents (lien + permissions) | feature | P2 | implemented | ITEM-028 |
| [ITEM-034](items/ITEM-034.md) | Recherche de documents | feature | P2 | implemented | ITEM-028 |

## Épic E — Notifications

| ID | Titre | Type | Prio | Statut | Dépend de |
|----|-------|------|------|--------|-----------|
| [ITEM-035](items/ITEM-035.md) | Modèle Notification + centre de notifications in-app | feature | P1 | implemented | ITEM-013 |
| [ITEM-036](items/ITEM-036.md) | Notifications push (Firebase Cloud Messaging) | feature | P2 | implemented | ITEM-035 |
| [ITEM-037](items/ITEM-037.md) | Templates de notifications centralisés (email + push) | feature | P1 | implemented | ITEM-005, ITEM-035 |
| [ITEM-038](items/ITEM-038.md) | Préférences de notifications utilisateur | feature | P2 | implemented | ITEM-035 |

## Épic F — IA

| ID | Titre | Type | Prio | Statut | Dépend de |
|----|-------|------|------|--------|-----------|
| [ITEM-039](items/ITEM-039.md) | Fondation intégration IA (client LLM générique) | feature | P2 | implemented | — |
| [ITEM-040](items/ITEM-040.md) | Chat IA (assistant conversationnel) | feature | P2 | implemented | ITEM-039 |
| [ITEM-041](items/ITEM-041.md) | Génération de contenu (texte) | feature | P2 | implemented | ITEM-039 |
| [ITEM-042](items/ITEM-042.md) | OCR et extraction de documents | feature | P3 | implemented | ITEM-039, ITEM-028 |
| [ITEM-043](items/ITEM-043.md) | Résumé et analyse de documents | feature | P3 | implemented | ITEM-039, ITEM-028 |
| [ITEM-044](items/ITEM-044.md) | Génération de documents assistée par IA | feature | P3 | implemented | ITEM-039 |

## Épic G — Paramètres

| ID | Titre | Type | Prio | Statut | Dépend de |
|----|-------|------|------|--------|-----------|
| [ITEM-045](items/ITEM-045.md) | Page profil utilisateur (infos, avatar, mot de passe) | feature | P1 | implemented | ITEM-001 |
| [ITEM-046](items/ITEM-046.md) | Paramètres de sécurité (2FA, sessions actives) | feature | P2 | implemented | ITEM-045 |
| [ITEM-047](items/ITEM-047.md) | Clés API (génération, révocation) | feature | P2 | implemented | ITEM-013 |
| [ITEM-048](items/ITEM-048.md) | Webhooks sortants (configuration côté organisation) | feature | P2 | implemented | ITEM-013 |
| [ITEM-049](items/ITEM-049.md) | Branding et personnalisation d'organisation (logo, couleurs) | feature | P2 | implemented | ITEM-017 |

## Épic H — Admin

| ID | Titre | Type | Prio | Statut | Dépend de |
|----|-------|------|------|--------|-----------|
| [ITEM-050](items/ITEM-050.md) | Console super-admin (comptes, organisations, suspension, impersonation) | feature | P1 | implemented | ITEM-013, ITEM-020 |
| [ITEM-051](items/ITEM-051.md) | Journal d'audit (AuditLog) | feature | P1 | implemented | ITEM-013 |
| [ITEM-052](items/ITEM-052.md) | Feature flags | feature | P3 | implemented | ITEM-050 |

## Épic I — API publique

| ID | Titre | Type | Prio | Statut | Dépend de |
|----|-------|------|------|--------|-----------|
| [ITEM-053](items/ITEM-053.md) | API REST publique versionnée (v1) | feature | P2 | implemented | ITEM-047 |
| [ITEM-054](items/ITEM-054.md) | Rate limiting sur l'API publique | feature | P2 | implemented | ITEM-053 |

## Épic J — Sécurité

| ID | Titre | Type | Prio | Statut | Dépend de |
|----|-------|------|------|--------|-----------|
| [ITEM-055](items/ITEM-055.md) | Durcissement sécurité applicative (CSRF, headers, validation) | chore | P1 | implemented | — |
| [ITEM-056](items/ITEM-056.md) | Sauvegardes base de données automatisées | chore | P2 | implemented | — |

## Épic K — Tests & CI/CD

| ID | Titre | Type | Prio | Statut | Dépend de |
|----|-------|------|------|--------|-----------|
| [ITEM-057](items/ITEM-057.md) | Mise en place des tests unitaires et d'intégration | chore | P1 | implemented | — |
| [ITEM-058](items/ITEM-058.md) | Tests E2E (Playwright) | chore | P2 | implemented | ITEM-057 |
| [ITEM-059](items/ITEM-059.md) | Pipeline CI/CD | chore | P1 | implemented | ITEM-057 |

## Épic L — Performance

| ID | Titre | Type | Prio | Statut | Dépend de |
|----|-------|------|------|--------|-----------|
| [ITEM-060](items/ITEM-060.md) | Cache et optimisation des requêtes | chore | P2 | implemented | — |
| [ITEM-061](items/ITEM-061.md) | Pagination et lazy loading des listes | feature | P2 | implemented | — |

## Épic M — Monitoring

| ID | Titre | Type | Prio | Statut | Dépend de |
|----|-------|------|------|--------|-----------|
| [ITEM-062](items/ITEM-062.md) | Logs structurés et tracking d'erreurs | chore | P2 | implemented | — |
| [ITEM-063](items/ITEM-063.md) | Health checks et alertes | feature | P2 | implemented | ITEM-062 |

## Épic N — Déploiement

| ID | Titre | Type | Prio | Statut | Dépend de |
|----|-------|------|------|--------|-----------|
| [ITEM-064](items/ITEM-064.md) | Dockerisation complète (Dockerfile, docker-compose, Nginx) | chore | P1 | implemented | — |

## Épic O — Enterprise

| ID | Titre | Type | Prio | Statut | Dépend de |
|----|-------|------|------|--------|-----------|
| [ITEM-065](items/ITEM-065.md) | SSO / SAML (Enterprise) | feature | P3 | implemented | ITEM-013 |
| [ITEM-066](items/ITEM-066.md) | RBAC granulaire par organisation (Enterprise) | feature | P3 | implemented | ITEM-018, ITEM-016 |
| [ITEM-067](items/ITEM-067.md) | Export d'audit et conformité (Enterprise) | feature | P3 | implemented | ITEM-051 |

## Épic P — White Label

| ID | Titre | Type | Prio | Statut | Dépend de |
|----|-------|------|------|--------|-----------|
| [ITEM-068](items/ITEM-068.md) | Domaine personnalisé par organisation (White Label) | feature | P3 | implemented | ITEM-049 |
| [ITEM-069](items/ITEM-069.md) | Thème et branding complet White Label | feature | P3 | implemented | ITEM-049 |

## Épic Q — Outillage développeur

| ID | Titre | Type | Prio | Statut | Dépend de |
|----|-------|------|------|--------|-----------|
| [ITEM-070](items/ITEM-070.md) | Seed de données de développement (organisation, owner, plans) + script `reset` | chore | P1 | implemented | ITEM-001, ITEM-013, ITEM-020 |
| [ITEM-071](items/ITEM-071.md) | Navigation principale — relier les pages orphelines et enrichir le menu utilisateur | chore | P2 | implemented | — |

## Épic R — Marketing & Onboarding

| ID | Titre | Type | Prio | Statut | Dépend de |
|----|-------|------|------|--------|-----------|
| [ITEM-072](items/ITEM-072.md) | Landing page publique + navigation vers inscription/connexion | feature | P1 | implemented | — |
| [ITEM-073](items/ITEM-073.md) | Assistant d'inscription — organisation (nom, logo) et invitations | feature | P1 | implemented | ITEM-014, ITEM-016, ITEM-049 |
| [ITEM-074](items/ITEM-074.md) | Sélection de plan à l'inscription — paiement immédiat ou essai 14 jours | feature | P1 | implemented | ITEM-073, ITEM-021 |
| [ITEM-075](items/ITEM-075.md) | Upload de logo d'organisation (remplace le champ URL texte) | feature | P2 | implemented | ITEM-049, ITEM-073, ITEM-027, ITEM-045 |

## Épic S — Gabarit de page CRUD standard

| ID | Titre | Type | Prio | Statut | Dépend de |
|----|-------|------|------|--------|-----------|
| [ITEM-076](items/ITEM-076.md) | DataTable enrichi — tri, filtres, sélection, actions groupées, export/import, colonnes | feature | P2 | implemented | ITEM-061 |
| [ITEM-077](items/ITEM-077.md) | Gabarit de page liste CRUD — en-tête, onglets, cartes de statistiques filtrables | feature | P2 | implemented | — |
| [ITEM-078](items/ITEM-078.md) | Migrer /admin/users vers le gabarit CRUD standard (référence pour les autres pages) | chore | P2 | implemented | ITEM-076, ITEM-077, ITEM-079 |
| [ITEM-079](items/ITEM-079.md) | DataTable — recherche en chip, pagination toujours visible, action pilotable depuis l'en-tête | bug | P2 | implemented | ITEM-076, ITEM-077 |
| [ITEM-080](items/ITEM-080.md) | Migrer /admin/invitations vers le gabarit CRUD standard (même structure que /admin/users) | chore | P2 | implemented | ITEM-078, ITEM-079 |
| [ITEM-081](items/ITEM-081.md) | CategoryStatCards — la grille remplit toute la ligne quel que soit le nombre de catégories | bug | P3 | implemented | ITEM-077 |
| [ITEM-082](items/ITEM-082.md) | Refonte du hub /settings — page de paramètres groupée en catégories (grille de cartes) | feature | P2 | implemented | ITEM-038, ITEM-071 |
| [ITEM-083](items/ITEM-083.md) | Page profil — regrouper Nom/Mot de passe/E-mail/Téléphone sous une section « Utilisateur » | chore | P2 | implemented | ITEM-045 |
| [ITEM-084](items/ITEM-084.md) | Fusionner 2FA et Sessions actives dans /profile (retirer /settings/security comme page séparée) | chore | P2 | implemented | ITEM-046, ITEM-082, ITEM-083 |

## Épic T — Gabarit de page uniforme (en-tête 3 colonnes + fiche détail 2/3-1/3)

| ID | Titre | Type | Prio | Statut | Dépend de |
|----|-------|------|------|--------|-----------|
| [ITEM-085](items/ITEM-085.md) | Généraliser l'en-tête de page — grille 3 colonnes (titre/sous-titre 2/3, actions 1/3 avec repli en menu) | feature | P2 | implemented | — |
| [ITEM-086](items/ITEM-086.md) | Gabarit de page fiche/détail — contenu 2/3 + panneau détails 1/3 | feature | P2 | implemented | ITEM-085 |
| [ITEM-087](items/ITEM-087.md) | Migrer /roles/[id] vers le gabarit fiche/détail (référence) | chore | P2 | implemented | ITEM-085, ITEM-086 |
| [ITEM-088](items/ITEM-088.md) | Migrer les pages liste CRUD existantes vers l'en-tête généralisé (ITEM-085) | chore | P2 | implemented | ITEM-085 |
| [ITEM-089](items/ITEM-089.md) | Migrer les pages fiche restantes (organisation, profil, facturation) vers le gabarit fiche/détail | chore | P3 | implemented | ITEM-086, ITEM-087 |
| [ITEM-090](items/ITEM-090.md) | Pages pleine largeur (retrait du plafond max-w-7xl) + généraliser PageHeader/DetailPageLayout à toute l'application | chore | P2 | implemented | ITEM-085, ITEM-086, ITEM-088 |

## Épic U — Facturation par owner & limites de plan

| ID | Titre | Type | Prio | Statut | Dépend de |
|----|-------|------|------|--------|-----------|
| [ITEM-094](items/ITEM-094.md) | Migration facturation — rattacher Subscription/Invoice/stripeCustomerId à l'utilisateur owner | chore | P1 | implemented | ITEM-013, ITEM-020 |
| [ITEM-095](items/ITEM-095.md) | Migration facturation — adapter Checkout/Portail/Webhooks Stripe au modèle par owner | chore | P1 | implemented | ITEM-094, ITEM-021, ITEM-022, ITEM-023 |
| [ITEM-096](items/ITEM-096.md) | Migration facturation — adapter les pages /billing* et les permissions au modèle par owner | chore | P1 | implemented | ITEM-094, ITEM-095, ITEM-023 |
| [ITEM-092](items/ITEM-092.md) | Limite du nombre d'utilisateurs (sièges) par plan — Starter 3, Pro 5, Enterprise 10/org | feature | P2 | todo | ITEM-016, ITEM-020, ITEM-050, ITEM-094 |
| [ITEM-093](items/ITEM-093.md) | Limite du nombre d'organisations par propriétaire selon le plan — Starter/Pro 1, Enterprise 3 | feature | P2 | todo | ITEM-013, ITEM-014, ITEM-092, ITEM-094 |

## Roadmap

| Version | Contenu |
|---------|---------|
| **MVP** | Épics A (Organizations) + C (Billing P0) — ITEM-013 à 016, 020 à 022 + ITEM-072 (landing page, sans quoi l'inscription n'est atteignable qu'en connaissant l'URL) + ITEM-073/074 (assistant d'inscription — organisation, invitations, plan, restructure directement le flux ITEM-014) |
| **V1** | Épics A/B/C complets + D (Documents P1) + E (Notifications P1) + G (Paramètres P1) + H (Admin) + J/K (Sécurité, Tests) + N (Déploiement) |
| **V2** | Épics D/E compléments (P2), I (API publique), L/M (Performance, Monitoring) |
| **V3** | Épic F (IA) P2 — chat, génération de contenu |
| **Enterprise** | Épic O (SSO, RBAC granulaire, export conformité) |
| **IA avancée** | Épic F P3 — OCR, résumé, génération de documents |
| **White Label** | Épic P (domaine personnalisé, branding complet) |

## Modules FATIHOUNE référencés

Plusieurs items s'appuient sur le registre de modules réutilisables FATIHOUNE
(`~/.claude/modules/_registry.json`), installables via `/module:add <module>` au
moment de l'implémentation :

| Module | Items concernés |
|--------|------------------|
| `multi-tenant` | ITEM-013 à ITEM-017 |
| `roles-permissions` | ITEM-018, ITEM-019 |
| `billing` | ITEM-020 à ITEM-026 |
| `upload` | ITEM-027, ITEM-028, ITEM-045 (avatar) |
| `notifications` | ITEM-035 à ITEM-038 |
| `user-profile` | ITEM-045 |
| `user-settings` | ITEM-038, ITEM-046 |
| `superadmin` | ITEM-050 |
| `datatable` | ITEM-019, ITEM-023, ITEM-050, ITEM-061, ITEM-076 (complète l'adoption partielle d'ITEM-061 — pas de réinstallation, `crud` volontairement écarté, voir notes ITEM-076) |
| `theme-config` | ITEM-049, ITEM-069 |

Ces modules recoupent en grande partie la fondation déjà **implémentée** (ITEM-001 à
012, Auth/Users/Roles/Dashboard custom en Better Auth) : à l'implémentation, adapter
les modules à l'existant plutôt que les installer en écrasant le code déjà livré.

## Prochaines actions suggérées
-2. `/backlog-verify ITEM-094, ITEM-095, ITEM-096` (migration complète de la facturation vers un modèle par owner : schéma, migration de données, `lib/billing.ts`, Checkout/Portail/Webhooks, pages `/billing*` en lecture seule pour les admins non-owner — `tsc`/`eslint`/tests passent partout ; reste une vérification Stripe en mode test et un scénario multi-comptes en navigateur à faire via `backlog-test`, ce dernier nécessitant ITEM-093 pour le cas « owner de 2 organisations »)
-1. `/backlog-implement ITEM-092` (limite de sièges par plan, dépend d'ITEM-094 — déjà implémenté), puis `/backlog-implement ITEM-093` (limite d'organisations par propriétaire — nouveau flux de création d'organisation, dépend d'ITEM-092 et ITEM-094)
0. `/backlog-verify ITEM-091` (bug corrigé : bouton « Choisir un plan »/« Changer de plan » ajouté dans `SubscriptionStatus`, visible même en essai)
1. `/backlog-verify ITEM-078, ITEM-079, ITEM-080` (revue de code + critères de l'Épic S désormais entièrement `implemented`), puis `/backlog-test` pour les captures/vérifications interactives restées hors de portée des vérifications HTTP statiques (clics réels sur chips/cartes, rafraîchissement après mutation en conditions navigateur)
1bis. `/backlog-implement ITEM-081` (petit correctif visuel de `CategoryStatCards`, indépendant du reste de l'Épic S)
1ter. `/backlog-verify ITEM-082` (refonte du hub `/settings`, implémentée)
1quater. `/backlog-verify ITEM-083, ITEM-084` (refonte de `/profile` en page « Informations personnelles » avec 2FA/Sessions fusionnés, implémentée)
2. `/backlog-verify ITEM-085, ITEM-086, ITEM-087, ITEM-088, ITEM-089, ITEM-090` (Épic T entièrement `implemented`, y compris le retrait du plafond de largeur global et la migration de toute l'application vers `PageHeader`/`DetailPageLayout`, déjà vérifiées en conditions réelles via Playwright pendant l'implémentation — voir Journal d'ITEM-090), puis `/backlog-test` pour des captures d'écran formelles
3. `/backlog-implement ITEM-029` → `ITEM-030` (suite Documents, sur la fondation ITEM-027/028 déjà livrée)
4. `/backlog-implement ITEM-035` (notifications in-app) et `ITEM-045` (profil) en parallèle
5. `/backlog-implement ITEM-055`, `ITEM-057`, `ITEM-059`, `ITEM-064` (sécurité, tests, CI, Docker) dès que la fondation MVP est stable
6. Le reste (IA, Enterprise, White Label) une fois le socle V1 livré et vérifié
