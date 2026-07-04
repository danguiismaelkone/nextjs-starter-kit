---
id: ITEM-003
title: Créer la page de login
status: verified
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

### Décisions d'implémentation
- Page `app/(auth)/login/page.tsx` (Server Component) : si session existante → redirige vers `/dashboard`, sinon rend `LoginForm`.
- Formulaire client `components/auth/login-form.tsx` : validation client (e-mail requis + format, mot de passe requis), soumission via `signIn.email({ email, password })`.
- **Anti-énumération** : toute erreur d'authentification affiche le même message générique `« E-mail ou mot de passe incorrect. »` (constante `INVALID_CREDENTIALS_MESSAGE`), sans révéler si l'e-mail existe.
- **Espace connecté** : nouvelle route protégée `app/dashboard/page.tsx` (Server Component) — `getSession()` → redirige vers `/login` si pas de session. C'est le **guard serveur** choisi (l'item autorisait « middleware OU guard serveur »). Elle sert de cible de redirection après login.
- **Déconnexion** : `components/auth/logout-button.tsx` (client) appelle `signOut()` puis redirige vers `/login` ; monté dans le header du dashboard.
- Liens : « Mot de passe oublié ? » → `/forgot-password` (fourni par ITEM-004) ; « Créer un compte » → `/register` (ITEM-002).
- Le lien `/forgot-password` renverra un 404 tant qu'ITEM-004 n'est pas implémenté (dépendance normale).
- Hors périmètre (non embarqué) : harmonisation de la redirection post-inscription d'ITEM-002 (`/` → `/dashboard`) — à traiter séparément si souhaité.

## Captures attendues
Formulaire de login ; erreur identifiants invalides (message générique) ; redirection vers `/dashboard` après succès ; accès à `/dashboard` sans session → redirection `/login` ; visite de `/login` en étant connecté → redirection `/dashboard` ; bouton de déconnexion sur le dashboard.

## Journal
- 2026-07-04 (backlog) — créé
- 2026-07-04 (implement) — démarrage
- 2026-07-04 (implement) — implémenté : page `/login` + formulaire (message d'erreur générique anti-énumération), espace connecté protégé `/dashboard` (guard `getSession()` → `/login`), bouton de déconnexion, liens forgot-password/register, redirection des sessions actives. Sanity : tsc OK, lint OK, build OK (routes `/login` et `/dashboard` présentes). Fichiers : app/(auth)/login/page.tsx, app/dashboard/page.tsx, components/auth/login-form.tsx, components/auth/logout-button.tsx.
- 2026-07-04 (verify) — vérifié : revue code OK (6/6 critères tracés), tsc OK, lint OK, build OK (routes `/login` + `/dashboard`). Anti-énumération centralisée, guard serveur `/dashboard` + redirection des sessions actives OK, bouton de déconnexion présent. 404 `/forgot-password` attendu (dépend d'ITEM-004).
