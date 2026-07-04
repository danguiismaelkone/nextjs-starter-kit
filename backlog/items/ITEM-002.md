---
id: ITEM-002
title: Créer la page d'enregistrement (sign-up self-service)
status: verified
priority: P0
type: feature
estimate: S
depends_on: [ITEM-001]
created: 2026-07-04
updated: 2026-07-04
---

## Idée / contexte
Le produit autorise l'inscription publique. Il faut une page permettant à un
nouvel utilisateur de créer un compte email/mot de passe.

## User story
En tant que visiteur, je veux créer un compte avec mon e-mail et un mot de passe,
afin d'accéder à l'application.

## Critères d'acceptation
- [x] Route `/register` (ou `/sign-up`) avec un formulaire (nom, e-mail, mot de passe, confirmation).
- [x] Validation côté client et serveur (format e-mail, longueur mot de passe, correspondance confirmation).
- [x] La soumission crée un utilisateur via Better Auth et ouvre une session.
- [x] Les erreurs (e-mail déjà utilisé, mot de passe faible) s'affichent lisiblement.
- [x] Après succès, redirection vers une page connectée (ex. `/dashboard` ou `/`).
- [x] Lien vers la page de login pour les utilisateurs existants.

## Notes techniques
- Fichiers : `app/(auth)/register/page.tsx`, composant formulaire, `lib/auth-client.ts`.
- Utiliser les composants shadcn/ui (Card, Button, Input, Label — ajouter ceux manquants).
- Hors-périmètre : vérification d'e-mail obligatoire (peut être un item ultérieur).

### Décisions d'implémentation
- Route `app/(auth)/register/page.tsx` (Server Component) : redirige vers `/` si une session existe déjà (`getSession()`), sinon rend le formulaire.
- Formulaire client `components/auth/register-form.tsx` : état contrôlé, validation client (nom requis, regex e-mail, mot de passe ≥ 8, correspondance confirmation), soumission via `signUp.email({ name, email, password })` de `lib/auth-client.ts`.
- **Validation serveur** assurée par Better Auth : unicité de l'e-mail (erreur `USER_ALREADY_EXISTS`) et longueur minimale du mot de passe (défaut 8). Les messages `error.message` renvoyés sont affichés dans un bandeau `role="alert"`.
- Composants shadcn ajoutés : `components/ui/input.tsx`, `components/ui/label.tsx` (style `radix-nova`, via `npx shadcn add`).
- Redirection succès → `/` (pas encore de `/dashboard`) puis `router.refresh()` pour rafraîchir l'état serveur.
- Le lien « Se connecter » pointe vers `/login` — cette route sera fournie par ITEM-003 (404 attendu tant qu'ITEM-003 n'est pas implémenté).

## Captures attendues
Formulaire d'inscription rempli ; état d'erreur (e-mail déjà pris) ; redirection après création réussie.

## Journal
- 2026-07-04 (backlog) — créé
- 2026-07-04 (implement) — démarrage
- 2026-07-04 (implement) — implémenté : page `/register` + formulaire client (validation client + erreurs Better Auth serveur, création de session, redirection `/`, lien login). Sanity : tsc OK, lint OK, build OK (route `/register` présente). Fichiers : app/(auth)/register/page.tsx, components/auth/register-form.tsx, components/ui/input.tsx, components/ui/label.tsx.
- 2026-07-04 (verify) — vérifié : revue code OK (6/6 critères tracés), tsc OK, lint OK, build OK (route `/register` présente). Pas de code mort ; double-soumission bloquée ; redirection des sessions actives. 404 `/login` attendu (dépend d'ITEM-003).
