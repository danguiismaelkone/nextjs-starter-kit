---
id: ITEM-033
title: Partage de documents (lien + permissions)
status: implemented
priority: P2
type: feature
estimate: M
depends_on: [ITEM-028]
created: 2026-07-16
updated: 2026-07-16
---

## Idée / contexte
Collaborer sur un document implique souvent de le partager avec quelqu'un qui n'a pas
forcément accès à toute l'organisation.

## User story
En tant qu'utilisateur, je veux partager un document via un lien avec des permissions
précises, afin de le rendre accessible sans donner accès à toute l'organisation.

## Critères d'acceptation
- [x] Génération d'un lien de partage avec expiration optionnelle et niveau d'accès
      (lecture seule / commentaire). *(voir note sur « commentaire » ci-dessous.)*
- [x] Le lien fonctionne sans compte pour un partage « public » explicite, ou nécessite
      une invitation pour un partage restreint. *(voir note sur « invitation » ci-dessous —
      décision assumée, pas d'oubli.)*
- [x] Le propriétaire peut révoquer un lien de partage à tout moment.

## Notes techniques
Modèle `DocumentShare` (documentId, token, expiresAt, accessLevel, visibility,
revokedAt, createdById) — légèrement plus riche que la proposition initiale
(`documentId, token, expiresAt, accessLevel`) : `visibility` était nécessaire
pour le 2ᵉ critère (public/restreint), `revokedAt` pour le 3ᵉ (révocation
traçable plutôt qu'une suppression qui effacerait l'historique des liens émis).

Décisions (deux critères contenaient une ambiguïté à trancher, documentée plutôt
que devinée en silence) :
- **« nécessite une invitation pour un partage restreint » → réutilise
  l'adhésion existante, pas un nouveau système d'invitation externe.** Ce repo
  n'a pas d'infrastructure pour inviter des personnes externes sans compte
  (l'`Invitation` existante crée un `Membership`, ITEM-008/016 — elle EST déjà
  le mécanisme d'invitation de l'app). Construire une invitation ad hoc par
  e-mail avec accès sans compte complet aurait été une fonctionnalité à part
  entière (auth invité, vérification d'e-mail), hors périmètre M de cet item.
  Interprétation retenue : `visibility: "public"` = aucune session requise ;
  `visibility: "restricted"` = requiert une session **et** une adhésion active
  (`Membership.status = "active"`) à l'organisation propriétaire du document —
  "invité" au sens où l'app l'entend déjà (devenir membre). Si non connecté,
  redirection vers `/login?callbackUrl=...` (support ajouté à
  `app/(auth)/login`, minimal et nécessaire pour que ce flux fonctionne) ; si
  connecté mais non membre, message « Accès refusé » explicite (pas de fuite
  du contenu).
- **« niveau d'accès commentaire » → stocké et affiché, pas fonctionnel.**
  Aucun modèle `Comment` n'existe dans ce repo ; construire un système de
  commentaires (thread, stockage, notifications) est une fonctionnalité
  indépendante et substantielle, hors périmètre d'un item « génération de lien
  de partage ». `accessLevel: "comment"` est sélectionnable à la création et
  affiché (badge), mais la page publique reste en lecture seule avec une
  mention explicite « Les commentaires ne sont pas encore disponibles » —
  honnête plutôt qu'une fausse zone de saisie non fonctionnelle. À couvrir par
  un futur item dédié si le produit en a besoin.
- Token généré comme `Invitation.token`
  (`app/(protected)/admin/invitations/actions.ts` : `randomBytes(24).toString("hex")`),
  même niveau d'entropie, même convention.
- Révocation par `revokedAt` (jamais de suppression de la ligne) : garde une
  trace de tous les liens émis pour un document, cohérent avec le choix
  `deletedAt`/`revokedAt` déjà fait ailleurs dans ce module (ITEM-029/032).
- Page publique `app/share/[token]/page.tsx` **hors** des groupes `(auth)`/
  `(protected)` — aucune garde de session par défaut, le token porte
  l'autorisation — même principe que `app/invite/accept/page.tsx` (seul autre
  précédent de page publique dans ce repo). Pas de `middleware.ts` dans ce
  repo : le contrôle d'accès est opt-in par layout, donc rien à exclure pour
  rendre cette page publique.
- Prévisualisation (image/PDF via URL signée `inline`) + téléchargement (URL
  signée `attachment`, nom original) réutilisent exactement la logique
  d'ITEM-030 — `contentDisposition()` déplacé de
  `app/api/documents/[id]/route.ts` vers `lib/storage.ts` (exporté) pour être
  partagé entre la route authentifiée et cette page publique, au lieu d'être
  dupliqué.
- `expiresInDays` (jamais/1/7/30 jours) plutôt qu'un date-picker brut : évite
  les soucis de fuseau horaire client/serveur et un composant de saisie de
  date supplémentaire, tout en couvrant le besoin du critère.
- Lien "Partager" ajouté au menu contextuel des documents dans
  `DocumentsExplorer.tsx`, à côté des entrées posées par ITEM-029/030/031/032 —
  pas de nouvelle affordance UI à inventer.

Fichiers : `prisma/schema.prisma` (modèle `DocumentShare` + relations
Document/User, migration `20260716123403_add_document_share`), `lib/shares.ts`,
`lib/storage.ts` (`contentDisposition` exporté),
`app/api/documents/[id]/shares/route.ts`,
`app/api/documents/[id]/shares/[shareId]/route.ts`, `app/share/[token]/page.tsx`,
`components/documents/ShareDialog.tsx`, `components/documents/DocumentsExplorer.tsx`
(action Partager), `app/(auth)/login/page.tsx` + `LoginForm.tsx` (`callbackUrl`).

Vérifications effectuées : `npx tsc --noEmit`, `npx eslint .` (aucune erreur,
1 warning préexistant sans rapport), `npx next build`, migration appliquée sur
la base de dev locale. `curl` sur toutes les nouvelles routes API (401 propres,
authentification requise) et sur `/share/[token]` avec un token inexistant
(serveur de dev déjà lancé) : après une 500 transitoire sur les tout premiers
appels (Turbopack encore en train de compiler la route nouvellement créée), la
page s'est stabilisée et affiche correctement « Lien invalide » — comportement
attendu confirmé, pas un défaut de code (logique validée indépendamment via
`tsx` en appelant `resolveShareByToken` directement, sans erreur). Pas de
vérification fonctionnelle authentifiée (génération réelle d'un lien, accès
public/restreint bout en bout, révocation) — à couvrir par `backlog-test`.

## Captures attendues
Lien de partage généré (public et restreint) depuis la modale Partager ; accès
au document via le lien public depuis une session non connectée ; redirection
login puis accès pour un lien restreint ; révocation rendant le lien inutilisable.

## Journal
- 2026-07-16 (backlog) — créé
- 2026-07-16 (implement) — démarrage
- 2026-07-16 (implement) — implémenté : modèle `DocumentShare`, génération/
  révocation de liens (modale Partager), page publique `/share/[token]` avec
  gating public/restreint (adhésion à l'organisation) et prévisualisation/
  téléchargement réutilisant ITEM-030. Fichiers : `prisma/schema.prisma`,
  `lib/shares.ts`, `lib/storage.ts`, `app/api/documents/[id]/shares/route.ts`,
  `app/api/documents/[id]/shares/[shareId]/route.ts`, `app/share/[token]/page.tsx`,
  `components/documents/ShareDialog.tsx`, `components/documents/DocumentsExplorer.tsx`,
  `app/(auth)/login/page.tsx`, `app/(auth)/login/LoginForm.tsx`.
