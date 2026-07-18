---
id: ITEM-096
title: "Migration facturation : adapter les pages /billing* et les permissions au modèle par owner"
status: implemented
priority: P1
type: chore
estimate: M
depends_on: [ITEM-094, ITEM-095, ITEM-023]
created: 2026-07-18
updated: 2026-07-18
---

## Idée / contexte
Dernier maillon de la migration (suite ITEM-094/095) : les pages
`/billing`, `/billing/plans`, `/billing/invoices` (ITEM-023/024) lisent
aujourd'hui `getCurrentOrganization()` puis
`prisma.subscription.findUnique({ where: { organizationId } })`. Avec
`Subscription.ownerId`, il faut décider **qui voit quoi** : un abonnement est
maintenant potentiellement partagé entre plusieurs organisations du même
owner (ITEM-093), donc la page doit soit lister les organisations couvertes,
soit clarifier qu'elle affiche l'abonnement de l'owner et pas de
l'organisation active.

**Changement de permission notable** : aujourd'hui `/billing` est accessible
à tout `admin`/`owner` de l'organisation (`hasPermission(..., "admin",
"access")`). Avec un abonnement personnel à l'owner, un **admin non-owner**
gérerait le moyen de paiement / résilierait l'abonnement de quelqu'un
d'autre — à restreindre : lecture seule (statut, factures) pour les
admins non-owner, actions de gestion (portail, changement de plan,
résiliation) réservées à l'owner lui-même.

## User story
En tant qu'owner de plusieurs organisations, je vois sur `/billing` mon
abonnement unique et la liste des organisations qu'il couvre. En tant
qu'admin d'une organisation dont je ne suis pas owner, je vois le statut de
l'abonnement en lecture seule, sans pouvoir le modifier.

## Critères d'acceptation
- [x] `/billing` affiche l'abonnement de l'**owner de l'organisation active**
      (pas nécessairement `session.user`) et, si plusieurs organisations sont
      couvertes (ITEM-093), les liste.
- [x] Actions de gestion (« Choisir/Changer de plan », « Gérer le moyen de
      paiement », résiliation) visibles et actives **uniquement si
      `session.user.id` est l'owner** de l'abonnement affiché ; lecture seule
      (statut, dates, factures) sinon.
- [x] `/billing/invoices` liste les factures de l'abonnement de l'owner
      (inchangé dans la forme, la source de données change) — déjà satisfait
      par ITEM-094 (nécessaire à la compilation), reconfirmé ici.
- [x] `app/(protected)/superadmin/page.tsx` (liste des organisations,
      ITEM-050) : la colonne « Plan »/« Abonnement » résout désormais via
      l'owner de l'organisation ; ajuster la requête Prisma en conséquence —
      déjà satisfait par ITEM-094, reconfirmé ici.
- [ ] Vérifié : un owner de 2 organisations (si ITEM-093 déjà livré) voit le
      même abonnement/plan depuis les deux ; un admin non-owner voit un
      statut en lecture seule sans les boutons d'action. — partiellement
      couvert : la logique de résolution (`ownerId`, `ownedOrganizations`,
      `canManage`) a été vérifiée par requêtes Prisma directes sur les
      données réelles du dev (2 organisations, chacune avec un owner
      distinct, aucun owner ne possédant encore plusieurs organisations —
      normal, ITEM-093 non livré). Le scénario « owner de 2 organisations »
      est donc **non testable avant ITEM-093** ; le scénario « admin
      non-owner en lecture seule » n'a pas été vérifié en navigateur
      (nécessite deux comptes distincts) — laissé à `backlog-test`.

## Notes techniques
- `app/(protected)/billing/page.tsx` (déjà résolu par owner depuis ITEM-094) :
  ajout de `canManage = session.user.id === ownerId` (via
  `getOrganizationOwnerId()`, pas de helper `isSubscriptionOwner()` séparé —
  voir correctif en tête de Journal) et d'une requête `ownedOrganizations`
  (`prisma.organization.findMany({ where: { memberships: { some: { userId:
  ownerId, role: "owner", status: "active" } } } } })`) listant toutes les
  organisations couvertes par cet abonnement.
- `components/billing/SubscriptionStatus.tsx` : nouvelle prop `canManage:
  boolean` (requise, pas de valeur par défaut — force chaque appelant à
  la calculer explicitement), conditionne l'affichage des boutons d'action
  ajoutés par ITEM-091 (« Choisir/Changer de plan »), `ManageBillingButton`,
  `CancelModal`, dans les deux branches du composant (avec et sans
  abonnement).
- Liste des organisations couvertes : affichée dans `DetailPanelSection`
  existant (`DetailPageLayout`, ITEM-090) comme un champ `value: ReactNode`
  supplémentaire — pas de nouveau composant — **uniquement si
  `ownedOrganizations.length > 1`** (évite d'afficher une liste à un seul
  élément dans le cas courant actuel). Noms affichés en texte simple
  (l'organisation active en gras), **pas de lien de bascule** : le mécanisme
  de changement d'organisation existant (`switchOrganizationAction`,
  `components/layout/OrgSwitcher.tsx`) est une Server Action déclenchée
  depuis un Client Component avec `router.refresh()` — en construire un
  équivalent ici aurait élargi le périmètre de cet item au-delà de « lister »
  (demandé) vers « permettre de basculer depuis cette page » (non demandé).
- `/billing/plans` **non modifié** : pas de critère explicite dessus. Un
  admin non-owner y voit toujours les boutons `PlanCard` (« Souscrire » reste
  volontairement ouvert aux admins, ITEM-094/095) ; un clic sur « Changer de
  plan » échoue proprement avec le message d'erreur déjà affiché par
  `PlanCard` (403 renvoyé par `change-plan/route.ts`, ITEM-095) — pas de
  régression, juste un raccourci de scope assumé (pas dans les critères de
  cet item).
- `/billing/invoices` et `superadmin/page.tsx` : aucun changement
  supplémentaire nécessaire, déjà conformes depuis ITEM-094.

## Captures attendues
Page `/billing` d'un owner listant les organisations couvertes par son
abonnement ; page `/billing` d'un admin non-owner en lecture seule (pas de
bouton d'action visible).

## Journal
- 2026-07-18 (backlog) — créé avec ITEM-094/095, suite à la décision de
  migrer la facturation vers un modèle par owner.
- 2026-07-18 (implement) — démarrage. Correction avant implémentation : les
  Notes techniques mentionnent `isSubscriptionOwner()` « ajouté par
  ITEM-095 » — en réalité ITEM-095 a délibérément renoncé à ce helper séparé
  (voir son Journal) au profit de `getOrganizationOwnerId()` +
  comparaison inline, car chaque appelant a besoin de la valeur `ownerId`
  elle-même, pas seulement d'un booléen. Cet item réutilise donc
  `getOrganizationOwnerId()` (ITEM-094) directement, pas
  `isSubscriptionOwner()` qui n'existe pas.
- 2026-07-18 (implement) — implémenté : prop `canManage` sur
  `SubscriptionStatus` (masque les actions de gestion pour un admin
  non-owner), liste des organisations couvertes sur `/billing` (affichée
  seulement si plus d'une). Vérifié par requêtes Prisma directes sur les
  données réelles du dev que la résolution `ownerId`/`ownedOrganizations`
  est correcte (2 organisations, chacune un seul owner distinct — cohérent
  avec ITEM-093 non livré). `pnpm exec tsc --noEmit`, `pnpm exec eslint .` et
  `pnpm exec vitest run` (70 tests) passent tous. Fichiers :
  `app/(protected)/billing/page.tsx`, `components/billing/SubscriptionStatus.tsx`.
