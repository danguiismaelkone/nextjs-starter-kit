---
id: ITEM-014
title: Inviter un utilisateur dans une modale (formulaire d'invitation)
status: verified
priority: P2
type: feature
estimate: S
depends_on: [ITEM-008, ITEM-011, ITEM-012, ITEM-015]
created: 2026-07-05
updated: 2026-07-05
---

## Idée / contexte
Le formulaire d'invitation (`InvitationCreateForm`) est aujourd'hui affiché **en
ligne** dans une `Card` en haut de `/admin/users/invitations`, au-dessus du tableau
des invitations récentes. Pour homogénéiser avec la création d'utilisateur
(ITEM-013) et alléger la page, on veut ouvrir ce formulaire dans une **modale**
(`Dialog`) déclenchée par un bouton « Inviter un utilisateur ». Item purement
UI/flux : **aucun changement de logique** ni de server action (`createInvitation`).

## User story
En tant qu'administrateur, je veux inviter un utilisateur via une fenêtre modale
depuis la page des invitations, afin d'envoyer une invitation sans quitter la liste
et avec une interface cohérente avec la création d'utilisateur.

## Critères d'acceptation
- [x] Un bouton « Inviter un utilisateur » sur l'onglet Invitations de `/admin/users`
      (voir note ITEM-015) ouvre une **modale** (`Dialog`) contenant le formulaire
      d'invitation (e-mail + rôle), à la place de la `Card` inline actuelle.
- [x] Le formulaire d'invitation (`InvitationCreateForm`) est **réutilisé** dans la
      modale avec la même validation (format d'e-mail) et les mêmes messages
      d'erreur/succès.
- [x] À l'**invitation réussie** : la liste des invitations récentes se met à jour
      (`router.refresh()`) et la nouvelle invitation « pending » y apparaît ; la modale
      se ferme (comportement aligné sur ITEM-013 : fermeture + refresh).
- [x] En cas d'**erreur** (e-mail invalide, déjà invité/inscrit selon les règles
      d'ITEM-008), le message s'affiche dans la modale qui **reste ouverte**, champ
      conservé.
- [x] Fermeture par « Annuler », icône ✕, Échap ou clic overlay sans envoyer
      d'invitation ; l'envoi en cours désactive les champs et le bouton (état « Envoi… »).
- [x] Responsive : la modale et le formulaire restent lisibles et utilisables sur mobile.
- [x] **Non-régression** : envoi d'invitation, e-mail Resend, et le tableau
      invitations (renvoi/révocation) restent conformes à ITEM-008.

## Notes techniques
- Fichiers : `app/admin/users/invitations/page.tsx` (retirer la `Card` inline, ajouter
  le bouton déclencheur — dans les actions du `PageHeader` de préférence), un nouveau
  composant client `components/admin/invitation-create-dialog.tsx` (trigger + `Dialog` +
  form), et `components/admin/invitation-create-form.tsx` si un callback `onSuccess` est
  nécessaire pour piloter la fermeture depuis le parent.
- Réutiliser la primitive `Dialog` existante ; viser la **même ergonomie** que la modale
  de création d'utilisateur (ITEM-013) pour la cohérence (titre, description, footer).
- Ne pas toucher aux server actions (`app/admin/users/invitations/actions.ts`) ni à
  l'envoi d'e-mail. shadcn/ui + Tailwind ; texte FR / code EN.
- Aligner le comportement post-succès sur ITEM-013 (fermeture + `router.refresh()`) pour
  une expérience homogène entre les deux modales.

## Captures attendues
Bouton « Inviter un utilisateur » dans la toolbar du tableau, onglet Invitations (plus
de formulaire inline) ; modale d'invitation ouverte (e-mail + rôle) ; message d'erreur
affiché dans la modale restée ouverte (e-mail déjà inscrit/invalide) ; après succès,
modale fermée et invitation « pending » apparue dans le tableau ; rendu mobile de la
modale.

## Journal
- 2026-07-05 (backlog) — créé
- 2026-07-05 (backlog) — dépend désormais d'ITEM-015 : le déclencheur d'invitation vit dans l'onglet « Invitations » de la page unifiée (plus une page dédiée). Faire ITEM-015 avant.
- 2026-07-05 (implement) — démarrage
- 2026-07-05 (implement) — implémenté : modale d'invitation via nouvelle `InvitationCreateDialog` déclenchée depuis la toolbar du tableau des invitations (slot `createSlot` du module DataTable, comme ITEM-013). `InvitationCreateForm` rendu réutilisable (`onSuccess`/`onCancel` + bouton « Annuler ») ; comportement inline (message « Invitation envoyée. ») conservé par défaut. `Card` inline retirée de l'onglet Invitations (`users-tabs.tsx`) → onglet symétrique de l'onglet Utilisateurs. Server actions d'invitation non modifiées. tsc + lint + `next build` OK. Fichiers : components/admin/invitation-create-dialog.tsx, components/admin/invitation-create-form.tsx, components/admin/invitations-columns.tsx, components/admin/users-tabs.tsx

## Décisions d'implémentation
- **Placement du bouton** : dans la toolbar du `InvitationsTable` via `createSlot` (le slot générique ajouté par ITEM-013), plutôt que dans les actions du `PageHeader`. Raison : depuis ITEM-015 le `PageHeader` est partagé par les deux onglets ; un bouton « Inviter » y apparaîtrait aussi sur l'onglet Utilisateurs. La toolbar rend les deux onglets symétriques (« Nouvel utilisateur » / « Inviter un utilisateur » au même endroit).
- **Post-succès aligné sur ITEM-013** : fermeture immédiate de la modale + `router.refresh()` (déclenché par le formulaire) ; la nouvelle ligne « pending » sert de confirmation. Pas de message persistant dans la modale (le message inline « Invitation envoyée. » reste le comportement par défaut hors modale).
- **Fermeture** : Radix `Dialog` (✕/Échap/overlay) + bouton « Annuler » (`onCancel`). Contenu démonté à la fermeture → champ réinitialisé à la réouverture ; en cas d'erreur la modale reste ouverte, champ conservé.
- **Symétrie** : `InvitationCreateDialog` calquée sur `UserCreateDialog` (même icône `Plus`, `size="sm"`, titre + description + form).
- 2026-07-05 (verify) — vérifié : revue statique OK (7/7 critères tracés dans le code), `tsc --noEmit` OK, `eslint .` OK, `next build` OK. Points contrôlés : bouton dans la toolbar via `createSlot` (invitations-columns.tsx:167), `Card` inline bien retirée de `users-tabs.tsx` (onglet Invitations = tableau seul), `InvitationCreateForm` réutilisé uniquement via la modale (validation `EMAIL_REGEX` inchangée), succès → `onSuccess` ferme + `router.refresh()` unique (déclenché par le formulaire) → ligne « pending » apparaît, erreur → modale ouverte champ conservé, `disabled={isSubmitting}` + « Envoi… », fermeture Radix (✕/Échap/overlay) + « Annuler ». Server actions d'invitation non modifiées (non-régression). Note non bloquante : responsive jugé statiquement (preuve visuelle → backlog-test) ; branche inline par défaut du formulaire (message « Invitation envoyée. ») conservée mais non utilisée actuellement — sans danger.
