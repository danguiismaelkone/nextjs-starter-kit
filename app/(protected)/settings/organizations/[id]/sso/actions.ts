"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { auth, getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { zodFieldErrors } from "@/lib/validation"
import {
  deleteProviderSchema,
  registerOidcProviderSchema,
  registerSamlProviderSchema,
  updateSsoSettingsSchema,
} from "@/lib/validators/sso"

export interface SsoActionState {
  success?: boolean
  formError?: string
  fieldErrors?: Record<string, string>
}

/**
 * Vérifie que l'utilisateur connecté est owner/admin de `organizationId` —
 * même règle que les autres réglages d'organisation (`updateOrganizationAction`,
 * `updateBrandingAction`, ITEM-017). Le plugin `@better-auth/sso` n'impose
 * lui-même qu'une session valide sur `/sso/register`/`/sso/delete-provider`
 * (n'importe quel utilisateur connecté pourrait sinon enregistrer un
 * fournisseur pour une organisation arbitraire) — cette vérification est donc
 * portée par l'app, pas déléguée au plugin.
 */
async function requireOrgAdminSession(organizationId: string) {
  const session = await getSession()
  if (!session?.user) return { ok: false as const, error: "Session introuvable, veuillez vous reconnecter." }

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, organizationId, status: "active" },
  })
  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    return { ok: false as const, error: "Vous n'avez pas les droits pour modifier cette organisation." }
  }

  return { ok: true as const, session }
}

export async function registerOidcProviderAction(_prevState: SsoActionState, formData: FormData): Promise<SsoActionState> {
  const parsed = registerOidcProviderSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) }
  const {
    organizationId,
    providerId,
    issuer,
    domain,
    clientId,
    clientSecret,
    skipDiscovery,
    authorizationEndpoint,
    tokenEndpoint,
    jwksEndpoint,
    userInfoEndpoint,
  } = parsed.data

  const auth_ = await requireOrgAdminSession(organizationId)
  if (!auth_.ok) return { formError: auth_.error }

  try {
    // `organizationId` volontairement omis du body : le plugin, quand ce
    // champ est fourni, vérifie l'appartenance à l'organisation via son
    // propre modèle `member` (celui du plugin `organization` de Better
    // Auth) — un modèle absent de ce repo, qui utilise ses propres
    // `Organization`/`Membership` (ITEM-017). L'appel plante alors avec
    // `BetterAuthError: Model "member" not found in schema` (constaté à
    // l'exécution). L'organisation est donc rattachée après coup via Prisma,
    // l'autorisation ayant déjà été vérifiée ci-dessus par
    // `requireOrgAdminSession`.
    //
    // `skipDiscovery` : la découverte automatique (`<issuer>/.well-known/...`)
    // exige que l'émetteur ET tous les endpoints qu'il référence soient dans
    // `trustedOrigins` de Better Auth (protection anti-SSRF du plugin) —
    // constaté à l'exécution même avec un émetteur public réel (Google :
    // l'issuer et son `token_endpoint` sont sur des sous-domaines différents,
    // chacun doit être individuellement approuvé par l'opérateur). En
    // self-service pour un client Enterprise arbitraire, la découverte
    // automatique ne peut donc pas fonctionner sans intervention de
    // l'opérateur de la plateforme. `skipDiscovery: true` (endpoints saisis
    // manuellement) est validé endpoint par endpoint comme publiquement
    // routable, sans nécessiter `trustedOrigins` — c'est le mode praticable
    // pour un émetteur arbitraire.
    await auth.api.registerSSOProvider({
      body: {
        providerId,
        issuer,
        domain,
        oidcConfig: skipDiscovery
          ? {
              clientId,
              clientSecret,
              skipDiscovery: true,
              authorizationEndpoint,
              tokenEndpoint,
              jwksEndpoint,
              userInfoEndpoint: userInfoEndpoint || undefined,
            }
          : { clientId, clientSecret },
      },
      headers: await headers(),
    })
    await prisma.ssoProvider.update({ where: { providerId }, data: { organizationId } })
  } catch (err) {
    return { formError: err instanceof Error ? err.message : "Échec de l'enregistrement du fournisseur OIDC." }
  }

  revalidatePath(`/settings/organizations/${organizationId}/sso`)
  return { success: true }
}

export async function registerSamlProviderAction(_prevState: SsoActionState, formData: FormData): Promise<SsoActionState> {
  const parsed = registerSamlProviderSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) }
  const { organizationId, providerId, issuer, domain, entryPoint, cert } = parsed.data

  const auth_ = await requireOrgAdminSession(organizationId)
  if (!auth_.ok) return { formError: auth_.error }

  // URL d'ACS (Assertion Consumer Service) que l'IdP doit appeler après
  // authentification — construite ici plutôt que saisie par l'admin (une
  // seule forme valide possible, dérivée de `providerId`).
  const callbackUrl = `${process.env.BETTER_AUTH_URL}/api/auth/sso/saml2/sp/acs/${providerId}`

  try {
    // `organizationId` omis du body pour la même raison que côté OIDC
    // (voir `registerOidcProviderAction`) — rattaché après coup via Prisma.
    await auth.api.registerSSOProvider({
      body: {
        providerId,
        issuer,
        domain,
        samlConfig: {
          entryPoint,
          cert,
          callbackUrl,
          spMetadata: {},
        },
      },
      headers: await headers(),
    })
    await prisma.ssoProvider.update({ where: { providerId }, data: { organizationId } })
  } catch (err) {
    return { formError: err instanceof Error ? err.message : "Échec de l'enregistrement du fournisseur SAML." }
  }

  revalidatePath(`/settings/organizations/${organizationId}/sso`)
  return { success: true }
}

export async function deleteSsoProviderAction(_prevState: SsoActionState, formData: FormData): Promise<SsoActionState> {
  const parsed = deleteProviderSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) }
  const { organizationId, providerId } = parsed.data

  const auth_ = await requireOrgAdminSession(organizationId)
  if (!auth_.ok) return { formError: auth_.error }

  // Le fournisseur appartient bien à cette organisation (jamais confiance
  // dans le seul `providerId` fourni par le formulaire).
  const provider = await prisma.ssoProvider.findFirst({ where: { providerId, organizationId } })
  if (!provider) return { formError: "Fournisseur introuvable." }

  try {
    // `auth.api.deleteSSOProvider` volontairement évité ici : son contrôle
    // d'accès interne (`checkProviderAccess`) retombe sur
    // `provider.userId === userId` dès que le plugin `organization` de
    // Better Auth n'est pas actif (notre cas, ITEM-017) — seul l'admin ayant
    // enregistré le fournisseur pourrait alors le supprimer, pas les autres
    // owners/admins de l'organisation. `requireOrgAdminSession` ci-dessus a
    // déjà effectué la vérification d'autorisation correcte (rôle
    // owner/admin sur l'organisation via notre propre modèle `Membership`),
    // donc la suppression est faite directement — même effet de bord que
    // l'endpoint du plugin (purge des `Account` liés à ce `providerId`).
    await prisma.$transaction([
      prisma.account.deleteMany({ where: { providerId } }),
      prisma.ssoProvider.delete({ where: { providerId } }),
    ])
  } catch (err) {
    return { formError: err instanceof Error ? err.message : "Échec de la suppression du fournisseur." }
  }

  revalidatePath(`/settings/organizations/${organizationId}/sso`)
  return { success: true }
}

export async function updateSsoSettingsAction(_prevState: SsoActionState, formData: FormData): Promise<SsoActionState> {
  const parsed = updateSsoSettingsSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) }
  const { organizationId, ssoDefaultRole, ssoEnforced } = parsed.data

  const auth_ = await requireOrgAdminSession(organizationId)
  if (!auth_.ok) return { formError: auth_.error }

  // Refuser d'activer `ssoEnforced` (mot de passe désactivé, critère 3) tant
  // qu'aucun fournisseur SSO n'est configuré : verrouillerait l'organisation
  // hors de tout moyen de connexion.
  if (ssoEnforced) {
    const providerCount = await prisma.ssoProvider.count({ where: { organizationId } })
    if (providerCount === 0) {
      return { formError: "Configurez au moins un fournisseur SSO avant de désactiver la connexion par mot de passe." }
    }
  }

  await prisma.organization.update({
    where: { id: organizationId },
    data: { ssoDefaultRole, ssoEnforced },
  })

  revalidatePath(`/settings/organizations/${organizationId}/sso`)
  return { success: true }
}
