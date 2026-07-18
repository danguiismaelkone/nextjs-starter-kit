---
id: ITEM-002
title: Créer la page d'enregistrement (sign-up self-service)
status: implemented
priority: P0
type: feature
estimate: S
depends_on: [ITEM-001]
created: 2026-07-04
updated: 2026-07-15
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

### Décisions prises à l'implémentation
- Page unique `app/(auth)/register/page.tsx`, `"use client"`, formulaire géré en `useState` (pas de react-hook-form/zod, aucune des deux libs n'était installée — validation manuelle suffisante pour 4 champs).
- Validation client : nom non vide, regex e-mail simple, mot de passe ≥ 8 caractères (aligné sur le `minPasswordLength` par défaut de Better Auth), confirmation = mot de passe. Erreurs affichées sous chaque champ.
- Validation serveur : déléguée à Better Auth (`authClient.signUp.email`) — ses codes d'erreur (`USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`, `INVALID_EMAIL`, `PASSWORD_TOO_SHORT`, `PASSWORD_TOO_LONG`) sont traduits en français via une petite table de correspondance, avec repli sur `error.message` puis message générique.
- `signUp.email` crée la session automatiquement (comportement par défaut de Better Auth) ; redirection vers `/dashboard` + `router.refresh()` après succès.
- Lien "Se connecter" pointe vers `/login` (page pas encore créée — ITEM-003, hors périmètre ici).
- Composant shadcn `label` ajouté (`pnpm dlx shadcn@latest add label`), manquant jusqu'ici.
- Vérifié en dev : `POST /api/auth/sign-up/email` → 200 + cookie de session + user créé en base ; rejouer la même requête → 422 `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL` (code couvert par la table de traduction) ; `GET /register` → 200. `tsc --noEmit`, lint et `pnpm build` OK.

## Captures attendues
Formulaire d'inscription rempli ; état d'erreur (e-mail déjà pris) ; redirection après création réussie.

## Journal
- 2026-07-04 (backlog) — créé
- 2026-07-15 (implement) — démarrage
- 2026-07-15 (implement) — implémenté : page `/register` (Card shadcn/ui, formulaire nom/e-mail/mot de passe/confirmation), validation client + erreurs Better Auth traduites en français, création de compte + session automatique, redirection `/dashboard`, lien vers `/login`. Fichiers : app/(auth)/register/page.tsx, components/ui/label.tsx. Vérifié en conditions réelles via l'API (création, doublon e-mail, rendu page) + tsc/lint/build.
