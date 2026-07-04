---
id: ITEM-002
title: Créer la page d'enregistrement (sign-up self-service)
status: todo
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
- [ ] Route `/register` (ou `/sign-up`) avec un formulaire (nom, e-mail, mot de passe, confirmation).
- [ ] Validation côté client et serveur (format e-mail, longueur mot de passe, correspondance confirmation).
- [ ] La soumission crée un utilisateur via Better Auth et ouvre une session.
- [ ] Les erreurs (e-mail déjà utilisé, mot de passe faible) s'affichent lisiblement.
- [ ] Après succès, redirection vers une page connectée (ex. `/dashboard` ou `/`).
- [ ] Lien vers la page de login pour les utilisateurs existants.

## Notes techniques
- Fichiers : `app/(auth)/register/page.tsx`, composant formulaire, `lib/auth-client.ts`.
- Utiliser les composants shadcn/ui (Card, Button, Input, Label — ajouter ceux manquants).
- Hors-périmètre : vérification d'e-mail obligatoire (peut être un item ultérieur).

## Captures attendues
Formulaire d'inscription rempli ; état d'erreur (e-mail déjà pris) ; redirection après création réussie.

## Journal
- 2026-07-04 (backlog) — créé
