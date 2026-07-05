# nextjs-starter-kit

## Coding standards (source unique, partagée entre projets)

Les conventions de code de l'équipe vivent dans `~/.claude/standards/` et sont importées ici.
Ne pas les redéfinir dans ce fichier : les modifier à la source.

@~/.claude/standards/coding.md
@~/.claude/standards/typescript.md
@~/.claude/standards/nextjs.md
@~/.claude/standards/styling.md
@~/.claude/standards/git.md

## Stack de ce projet

- Next.js 16 (App Router), React 19, TypeScript strict
- Tailwind CSS v4 + shadcn/ui (style `radix-nova`, base `neutral`, icônes lucide)
- Prisma 7 (PostgreSQL) — client singleton dans `lib/prisma.ts`
- Auth : better-auth (`lib/auth.ts` serveur, `lib/auth-client.ts` client)
- Emails : resend (`lib/email.ts`)

## Repères de structure

- `app/` — routes App Router
- `components/ui` — primitives shadcn ; `components/*` — features par domaine (admin, auth, data-table, invite)
- `lib/` — logique non-UI réutilisable (auth, authorization, validation, prisma, email)
- `prisma/` — schéma et migrations
- `backlog/` — items de backlog (skills backlog / backlog-implement / backlog-verify / backlog-test)
- Alias d'import : `@/*` → racine du projet

## Commandes

- `pnpm dev` — serveur de dev
- `pnpm build` — build de prod
- `pnpm lint` — ESLint (config `eslint-config-next` core-web-vitals + typescript)
- `pnpm promote-admin` — promeut un utilisateur admin (`scripts/promote-admin.ts`)
