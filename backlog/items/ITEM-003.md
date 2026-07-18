---
id: ITEM-003
title: Créer la page de login
status: implemented
priority: P0
type: feature
estimate: S
depends_on: [ITEM-001]
created: 2026-07-04
updated: 2026-07-15
---

## Idée / contexte
Les utilisateurs existants doivent pouvoir se connecter. Page de login
email/mot de passe reposant sur la fondation Better Auth.

## User story
En tant qu'utilisateur enregistré, je veux me connecter avec mon e-mail et mon
mot de passe, afin de retrouver mon espace.

## Critères d'acceptation
- [x] Route `/login` (ou `/sign-in`) avec formulaire e-mail + mot de passe.
- [x] Connexion réussie crée une session et redirige vers la page connectée.
- [x] Identifiants invalides affichent un message d'erreur clair sans divulguer si l'e-mail existe.
- [x] Lien « Mot de passe oublié ? » vers la page de réinitialisation (ITEM-004).
- [x] Lien vers la page d'enregistrement pour les nouveaux utilisateurs.
- [x] Une route protégée redirige vers `/login` si aucune session ; un utilisateur déjà connecté qui visite `/login` est redirigé vers l'espace connecté.

## Notes techniques
- Fichiers : `app/(auth)/login/page.tsx`, middleware ou guard serveur pour la protection des routes.
- Réutiliser `getSession()` d'ITEM-001.
- Prévoir un bouton de déconnexion accessible depuis l'espace connecté.

### Décisions prises à l'implémentation
- `app/(auth)/login/page.tsx` : Server Component, appelle `getSession()` et `redirect("/dashboard")` si une session existe déjà — couvre la partie "utilisateur déjà connecté" du dernier critère. La protection de `/dashboard` (redirection vers `/login` si absente de session) existe déjà côté `app/(protected)/layout.tsx` (ITEM-009), pas dupliquée ici.
- `app/(auth)/login/LoginForm.tsx` : composant client séparé (formulaire + état), gardé distinct de la page pour que la vérification de session reste server-side.
- Message d'erreur volontairement **unique et générique** ("E-mail ou mot de passe incorrect.") quel que soit le code renvoyé par Better Auth — vérifié que `signIn.email` renvoie le même code `INVALID_EMAIL_OR_PASSWORD` que l'e-mail existe ou non (pas de user enumeration côté API, donc pas de logique de distinction côté UI non plus).
- Lien "Mot de passe oublié ?" → `/forgot-password`, lien "Créer un compte" → `/register` : routes alignées sur les notes techniques d'ITEM-004 et le fichier déjà créé par ITEM-002.
- Bouton de déconnexion : déjà fourni par `NavUser` (menu utilisateur de la sidebar, ITEM-009) — pas de nouveau composant nécessaire ici.
- Vérifié en conditions réelles via l'API Better Auth : mot de passe erroné et e-mail inexistant renvoient tous deux `401 INVALID_EMAIL_OR_PASSWORD` ; connexion correcte → `200` + cookie de session ; `GET /login` sans session → `200`, avec session → `307` vers `/dashboard` ; `/dashboard` accessible avec la session. `tsc --noEmit`, lint et `pnpm build` OK.

## Captures attendues
Formulaire de login ; erreur identifiants invalides ; redirection vers l'espace connecté après succès.

## Journal
- 2026-07-04 (backlog) — créé
- 2026-07-15 (implement) — démarrage
- 2026-07-15 (implement) — implémenté : page `/login` (formulaire e-mail/mot de passe), connexion via Better Auth, message d'erreur générique sans divulgation d'existence d'e-mail, liens vers `/forgot-password` et `/register`, redirection `/dashboard` si déjà connecté, protection de `/dashboard` réutilisée depuis ITEM-009. Fichiers : app/(auth)/login/page.tsx, app/(auth)/login/LoginForm.tsx. Vérifié en conditions réelles via l'API (login valide/invalide, redirections) + tsc/lint/build.
