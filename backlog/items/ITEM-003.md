---
id: ITEM-003
title: Créer la page de login
status: todo
priority: P0
type: feature
estimate: S
depends_on: [ITEM-001]
created: 2026-07-04
updated: 2026-07-04
---

## Idée / contexte
Les utilisateurs existants doivent pouvoir se connecter. Page de login
email/mot de passe reposant sur la fondation Better Auth.

## User story
En tant qu'utilisateur enregistré, je veux me connecter avec mon e-mail et mon
mot de passe, afin de retrouver mon espace.

## Critères d'acceptation
- [ ] Route `/login` (ou `/sign-in`) avec formulaire e-mail + mot de passe.
- [ ] Connexion réussie crée une session et redirige vers la page connectée.
- [ ] Identifiants invalides affichent un message d'erreur clair sans divulguer si l'e-mail existe.
- [ ] Lien « Mot de passe oublié ? » vers la page de réinitialisation (ITEM-004).
- [ ] Lien vers la page d'enregistrement pour les nouveaux utilisateurs.
- [ ] Une route protégée redirige vers `/login` si aucune session ; un utilisateur déjà connecté qui visite `/login` est redirigé vers l'espace connecté.

## Notes techniques
- Fichiers : `app/(auth)/login/page.tsx`, middleware ou guard serveur pour la protection des routes.
- Réutiliser `getSession()` d'ITEM-001.
- Prévoir un bouton de déconnexion accessible depuis l'espace connecté.

## Captures attendues
Formulaire de login ; erreur identifiants invalides ; redirection vers l'espace connecté après succès.

## Journal
- 2026-07-04 (backlog) — créé
