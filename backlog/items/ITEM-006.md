---
id: ITEM-006
title: Rôles utilisateur (user/admin) et contrôle d'accès
status: implemented
priority: P1
type: feature
estimate: S
depends_on: [ITEM-001]
created: 2026-07-04
updated: 2026-07-15
---

## Idée / contexte
Le CRUD users (ITEM-007) et l'invitation (ITEM-008) doivent être réservés aux
administrateurs. Il faut un champ `role` et des garde-fous d'accès réutilisables.

## User story
En tant qu'administrateur, je veux que seules les personnes autorisées accèdent aux
fonctions d'administration, afin de protéger la gestion des utilisateurs.

## Critères d'acceptation
- [x] Le modèle `User` possède un champ `role` (`user` par défaut, `admin`).
- [x] Un helper serveur `requireAdmin()` (ou équivalent) protège les pages/actions admin et renvoie 403/redirection sinon.
- [x] Un utilisateur `user` qui tente d'accéder à une route admin est bloqué (redirigé ou 403).
- [x] Il existe un moyen documenté de promouvoir un premier admin (seed, script, ou variable d'env).
- [x] La session/le contexte expose le rôle courant côté serveur et client.

## Notes techniques
- Fichiers : `prisma/schema.prisma` (champ role), `lib/auth.ts` (exposer role dans la session), `lib/authorization.ts`.
- Envisager le plugin `admin` de Better Auth si pertinent, sinon rôle applicatif simple.
- Hors-périmètre : permissions fines / RBAC multi-rôles (au-delà de user/admin).

### Décisions prises à l'implémentation
- Rôle applicatif simple plutôt que le plugin `admin` de Better Auth : ce plugin ajoute des fonctionnalités hors-scope (ban, impersonation, listing admin...) que ITEM-007/008 géreront eux-mêmes si besoin. Champ `role` exposé via `user.additionalFields` dans `lib/auth.ts` (fonctionnalité core de Better Auth, pas besoin de plugin serveur).
- `role` : `type: "string"`, `defaultValue: "user"`, **`input: false`** — empêche explicitement qu'un utilisateur s'auto-attribue `role: "admin"` via le body de `/sign-up/email` ou `/update-user`. Vérifié : un sign-up avec `"role":"admin"` dans le body est bien ignoré (reste `"user"`).
- Prisma : champ `role String @default("user")`, migration `20260715092047_add_user_role`.
- Côté client, `lib/auth-client.ts` utilise le plugin `inferAdditionalFields<typeof auth>()` (import `type auth` uniquement — erased à la compilation, pas de fuite de code serveur dans le bundle client, vérifié en grepant `.next/static/chunks`) pour que `useSession()` type correctement `role`. Côté serveur, `getSession()` typait déjà `role` correctement sans plugin ni cast (les casts `as { role?: string }` d'ITEM-009 ont été supprimés).
- `lib/authorization.ts` : `requireAdmin()` redirige vers `/login` si pas de session, vers `/dashboard` si `role !== "admin"` (redirection plutôt qu'un vrai 403 HTTP — cohérent avec le reste du repo qui utilise `redirect()` partout, pas de handler d'erreur HTTP custom).
- Page `app/(protected)/admin/users/page.tsx` ajoutée en stub minimal (appelle `requireAdmin()` puis affiche un titre) : nécessaire pour avoir une route admin réelle à protéger et tester (le lien `/admin/users` existait déjà dans `AppSidebar.tsx` depuis ITEM-009 mais menait à un 404). Le contenu CRUD reste hors-périmètre (ITEM-007).
- Premier admin : script `scripts/promote-admin.mjs <email>` (Prisma direct, pas de dépendance à tsx — utilise uniquement des imports npm réels) documenté dans le `README.md`. Pas de variable d'env `ADMIN_EMAILS` : plus simple et suffisant vu qu'il n'y a qu'un seul admin à amorcer.
- **Piège rencontré** : après `prisma migrate dev`, le Prisma Client généré n'était pas à jour tant que `prisma generate` n'avait pas tourné explicitement (l'inscription échouait avec `Unknown argument role`). Une fois régénéré, le serveur `next dev` déjà lancé gardait quand même l'ancien client en mémoire (Turbopack ne recharge pas le Prisma Client généré) — redémarrage du serveur nécessaire après tout changement de schéma.
- Vérifié en conditions réelles (curl + Playwright) : rôle `user` par défaut à l'inscription (y compris tentative de forcer `role: "admin"` dans le body, ignorée) ; `/admin/users` → 307 vers `/dashboard` pour un `user`, 200 pour un `admin` après promotion via le script ; section "Administration" visible dans la sidebar uniquement pour l'admin (capture d'écran) ; `role` présent dans `GET /api/auth/get-session`. `tsc --noEmit`, lint, `pnpm build` OK.

## Captures attendues
Accès refusé pour un compte `user` sur une route admin ; accès autorisé pour un compte `admin`.

## Journal
- 2026-07-04 (backlog) — créé
- 2026-07-15 (implement) — démarrage
- 2026-07-15 (implement) — implémenté : champ `role` sur `User` (défaut `user`), exposé côté serveur et client via `additionalFields`/`inferAdditionalFields`, non modifiable via l'API (`input: false`), helper `requireAdmin()`, route stub `/admin/users` protégée, script `scripts/promote-admin.mjs` documenté dans le README. Fichiers : prisma/schema.prisma, prisma/migrations/20260715092047_add_user_role, lib/auth.ts, lib/auth-client.ts, lib/authorization.ts, app/(protected)/admin/users/page.tsx, app/(protected)/layout.tsx, scripts/promote-admin.mjs, README.md. Vérifié en conditions réelles (curl + Playwright) : blocage user/autorisation admin sur route réelle, rôle non falsifiable à l'inscription, promotion via script, affichage conditionnel de la sidebar. tsc/lint/build OK.
