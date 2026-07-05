This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


## Modules installed

shadcn ui
prisma
better-auth


### Prisma setup
https://ethanmick.com/how-to-set-up-prisma-with-next-js-postgres/

Prisma 7 connects through a driver adapter (`@prisma/adapter-pg`); see
`lib/prisma.ts`. The connection string is read from `DATABASE_URL` (used both at
runtime and by Prisma Migrate via `prisma.config.ts`).

### Authentication (Better Auth)

Email/password auth is wired with [Better Auth](https://www.better-auth.com/)
and the Prisma adapter.

- Server config & `getSession()` helper: `lib/auth.ts`
- Browser client: `lib/auth-client.ts`
- API route handler: `app/api/auth/[...all]/route.ts`

Required environment variables (see `.env`):

```bash
DATABASE_URL=                 # PostgreSQL connection string
BETTER_AUTH_SECRET=           # session/token signing secret — openssl rand -base64 32
BETTER_AUTH_URL=              # app base URL, e.g. http://localhost:3000
NEXT_PUBLIC_BETTER_AUTH_URL=  # base URL exposed to the browser auth client
```

Run migrations after cloning: `npx prisma migrate dev`.

### Roles & access control

Each user has a `role` (`user` by default, or `admin`), exposed in the session
on both the server and the client. Admin areas are gated by reusable helpers in
`lib/authorization.ts`:

- `requireAdmin()` — for Server Components / pages: redirects to `/login` when
  anonymous, or `/dashboard` when authenticated but not an admin.
- `requireAdminOrThrow()` — for Route Handlers / Server Actions: throws an
  `AuthorizationError` (`401`/`403`) instead of redirecting.
- `requireAuth()`, `getCurrentUser()`, `isAdmin()` — supporting helpers.

`/admin` is an example page protected by `requireAdmin()`.

**Bootstrap the first admin:** sign the user up through the normal flow, then
promote them once:

```bash
pnpm promote-admin user@example.com
# or: ADMIN_EMAIL=user@example.com pnpm promote-admin
```

Roles cannot be self-assigned at sign-up (`input: false` in `lib/auth.ts`).

### Transactional e-mail (Resend)

Transactional e-mails (password reset, invitations) go through a small service
in `lib/email.ts`: a generic `sendEmail()` plus dedicated helpers
`sendPasswordResetEmail()` and `sendInvitationEmail()`.

- **Dev fallback:** if `RESEND_API_KEY` is unset, e-mails are logged to the
  console (with the link) instead of being sent — no Resend account needed
  locally.
- Send failures are caught and logged; they never throw, so a failed e-mail
  won't crash the calling flow.

Required environment variables (see `.env`):

```bash
RESEND_API_KEY=   # Resend API key; empty ⇒ dev fallback (console log)
EMAIL_FROM=       # sender address (verified Resend domain in prod);
                  # defaults to onboarding@resend.dev
```
