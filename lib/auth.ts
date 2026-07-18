import { betterAuth, APIError } from "better-auth";
import { twoFactor, admin } from "better-auth/plugins";
import { adminAc, userAc } from "better-auth/plugins/admin/access";
import { createAuthMiddleware } from "better-auth/api";
import { sso } from "@better-auth/sso";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  plugins: [
    // ITEM-046 : 2FA TOTP officielle plutôt qu'une réimplémentation maison.
    twoFactor({ issuer: "SaaS Core" }),
    // ITEM-050 : rôle système `superadmin` distinct du rôle `admin` d'organisation
    // (RBAC scoped, ITEM-018) — `adminRoles` fait porter les endpoints
    // ban/impersonation du plugin uniquement par ce rôle plateforme, jamais
    // attribuable depuis l'UI d'une organisation cliente (admin/users limite les
    // rôles assignables à user/admin). `roles` redéclare le rôle "admin" par
    // défaut du plugin sous la clé "superadmin" (mêmes permissions) : `adminRoles`
    // exige que chaque rôle listé soit défini ici.
    admin({
      defaultRole: "user",
      adminRoles: ["superadmin"],
      roles: { superadmin: adminAc, user: userAc },
    }),
    // ITEM-065 : SAML/OIDC Enterprise, plugin officiel évalué avant toute
    // implémentation custom (voir Notes techniques du backlog). Ce repo a son
    // propre modèle `Organization`/`Membership` (ITEM-013), pas le plugin
    // `organization` de Better Auth — `organizationProvisioning` (conçu pour ce
    // dernier) n'est donc pas utilisé ; `provisionUser` gère le rattachement
    // à l'organisation nous-mêmes, avec notre propre modèle.
    sso({
      provisionUser: async ({ user, provider }) => {
        if (!provider.organizationId) return

        const organization = await prisma.organization.findUnique({
          where: { id: provider.organizationId },
          select: { ssoDefaultRole: true },
        });
        if (!organization) return;

        // Idempotent : un utilisateur qui se reconnecte plusieurs fois ne doit
        // pas dupliquer/écraser un rôle déjà élevé manuellement depuis
        // /admin/users — seule la création initiale fixe le rôle par défaut.
        await prisma.membership.upsert({
          where: { userId_organizationId: { userId: user.id, organizationId: provider.organizationId } },
          create: {
            userId: user.id,
            organizationId: provider.organizationId,
            role: organization.ssoDefaultRole,
            status: "active",
          },
          update: { status: "active" },
        });
      },
    }),
  ],
  emailAndPassword: {
    enabled: true,
    // Route via le point d'entrée centralisé (ITEM-037) : envoie l'e-mail
    // (gabarit ITEM-005) et crée l'entrée in-app/push (ITEM-035/036) correspondante.
    sendResetPassword: async ({ user, url }) => {
      await notify(user.id, "password_reset_requested", { url });
    },
  },
  user: {
    additionalFields: {
      // `role` (et `banned`/`banReason`/`banExpires`) sont maintenant portés par
      // le plugin `admin` ci-dessus (ITEM-050) — ne pas les redéclarer ici, il
      // les définit déjà avec `input: false`.
      // Modifiables par l'utilisateur via `authClient.updateUser()` (ITEM-045).
      phone: {
        type: "string",
        required: false,
        input: true,
      },
      bio: {
        type: "string",
        required: false,
        input: true,
      },
    },
  },
  databaseHooks: {
    session: {
      create: {
        // Empêche la création d'une nouvelle session (connexion) pour un compte désactivé (ITEM-007).
        before: async (session) => {
          const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { disabledAt: true },
          });
          if (user?.disabledAt) {
            throw new APIError("FORBIDDEN", {
              message: "Ce compte a été désactivé.",
              code: "ACCOUNT_DISABLED",
            });
          }
        },
      },
    },
  },
  hooks: {
    // ITEM-065, critère 3 : bloque la connexion par mot de passe pour les
    // membres d'une organisation ayant explicitement activé `ssoEnforced` —
    // ciblé sur `/sign-in/email` uniquement, jamais sur `/sso/callback*`
    // (sinon la connexion SSO elle-même se bloquerait). Un compte inexistant
    // ou sans organisation "SSO obligatoire" n'est pas concerné : Better Auth
    // traite la suite normalement (identifiants invalides, etc.).
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-in/email") return;

      const email = typeof ctx.body?.email === "string" ? ctx.body.email : undefined;
      if (!email) return;

      const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      if (!user) return;

      const ssoEnforcedMembership = await prisma.membership.findFirst({
        where: { userId: user.id, status: "active", organization: { ssoEnforced: true } },
        select: { id: true },
      });
      if (ssoEnforcedMembership) {
        throw new APIError("FORBIDDEN", {
          message: "La connexion par mot de passe est désactivée pour votre organisation — utilisez la connexion SSO.",
          code: "SSO_REQUIRED",
        });
      }
    }),
  },
});

export async function getSession() {
  const { headers } = await import("next/headers");
  return auth.api.getSession({ headers: await headers() });
}
