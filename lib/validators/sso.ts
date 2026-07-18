import { z } from "zod"

const MAX_PROVIDER_ID_LENGTH = 100
const MAX_DOMAIN_LENGTH = 255

export const providerIdSchema = z
  .string()
  .trim()
  .min(1, "Identifiant du fournisseur requis.")
  .max(MAX_PROVIDER_ID_LENGTH, "Identifiant trop long.")
  .regex(/^[a-z0-9-]+$/, "Minuscules, chiffres et tirets uniquement.")

const domainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Domaine requis.")
  .max(MAX_DOMAIN_LENGTH, "Domaine trop long.")

// Les URLs de découverte automatique (issuer + endpoints qu'elle référence)
// doivent toutes figurer dans `trustedOrigins` de Better Auth (protection
// anti-SSRF du plugin @better-auth/sso — voir Notes techniques ITEM-065) :
// en pratique, la découverte automatique ne fonctionne donc que pour des
// émetteurs pré-approuvés par l'opérateur de la plateforme, pas en libre-
// service pour un client Enterprise arbitraire. `skipDiscovery` (endpoints
// saisis manuellement par l'admin, chacun validé individuellement comme
// publiquement routable) est donc le mode recommandé en pratique.
export const registerOidcProviderSchema = z.object({
  organizationId: z.string().trim().min(1),
  providerId: providerIdSchema,
  issuer: z.string().trim().url("URL d'émetteur (issuer) invalide."),
  domain: domainSchema,
  clientId: z.string().trim().min(1, "Client ID requis."),
  clientSecret: z.string().trim().min(1, "Client Secret requis."),
  skipDiscovery: z.enum(["true", "false"]).optional().transform((value) => value === "true"),
  authorizationEndpoint: z.string().trim().url("URL d'autorisation invalide.").optional().or(z.literal("")),
  tokenEndpoint: z.string().trim().url("URL de jeton (token) invalide.").optional().or(z.literal("")),
  jwksEndpoint: z.string().trim().url("URL JWKS invalide.").optional().or(z.literal("")),
  userInfoEndpoint: z.string().trim().url("URL userinfo invalide.").optional().or(z.literal("")),
}).refine(
  (data) => !data.skipDiscovery || (data.authorizationEndpoint && data.tokenEndpoint && data.jwksEndpoint),
  {
    message: "URLs d'autorisation, de jeton et JWKS requises en configuration manuelle.",
    path: ["authorizationEndpoint"],
  },
)

export const registerSamlProviderSchema = z.object({
  organizationId: z.string().trim().min(1),
  providerId: providerIdSchema,
  issuer: z.string().trim().min(1, "Émetteur (issuer) requis."),
  domain: domainSchema,
  entryPoint: z.string().trim().url("URL du point d'entrée (Entry Point / SSO URL) invalide."),
  cert: z.string().trim().min(1, "Certificat X.509 requis."),
})

export const deleteProviderSchema = z.object({
  organizationId: z.string().trim().min(1),
  providerId: providerIdSchema,
})

export const updateSsoSettingsSchema = z.object({
  organizationId: z.string().trim().min(1),
  ssoDefaultRole: z.enum(["member", "admin"], { message: "Rôle par défaut invalide." }),
  ssoEnforced: z.enum(["true", "false"]).transform((value) => value === "true"),
})
