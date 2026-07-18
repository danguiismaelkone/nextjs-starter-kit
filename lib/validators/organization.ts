import { z } from "zod"
import { isValidHexColor, isValidFontFamily } from "@/lib/theme"
import { NOTIFICATION_CATEGORIES } from "@/lib/notification-templates"

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/
const MAX_ORGANIZATION_NAME_LENGTH = 150

/** Identifiant opaque (id, token, clé) — présence/type vérifiés ici, l'existence/portée le sont via la base ensuite. */
export const idSchema = z.string().trim().min(1, "Identifiant invalide.")

/**
 * Étape « Organisation » de l'assistant d'inscription (`/onboarding`, ITEM-073) —
 * nom obligatoire (contrairement à l'ancien champ optionnel de `/register` avec
 * repli automatique, ITEM-014 : une étape dédiée peut se permettre d'exiger une
 * vraie saisie). Le logo n'est plus soumis dans ce formulaire (ITEM-075) : c'est
 * un upload de fichier séparé vers `POST /api/organizations/[id]/logo`, une fois
 * l'organisation créée et son id connu.
 */
export const onboardingOrganizationSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis.").max(MAX_ORGANIZATION_NAME_LENGTH, "Le nom est trop long."),
})

export const updateOrganizationSchema = z.object({
  organizationId: idSchema,
  name: z.string().trim().min(1, "Le nom est requis.").max(MAX_ORGANIZATION_NAME_LENGTH, "Le nom est trop long."),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(SLUG_REGEX, "Minuscules, chiffres et tirets uniquement (ex. mon-organisation)."),
})

/**
 * Pas de retour à la ligne ni `<`/`>` (ITEM-069) : cette valeur est
 * interpolée telle quelle dans l'en-tête `From` (`"<nom> <adresse>"`,
 * `lib/email.ts`) — un retour à la ligne permettrait une injection d'en-tête
 * SMTP, `<`/`>` casserait la construction de l'adresse elle-même.
 */
const EMAIL_FROM_NAME_REGEX = /^[^\r\n<>]{1,100}$/

export const brandingSchema = z.object({
  organizationId: idSchema,
  primaryColor: z
    .string()
    .trim()
    .optional()
    .default("")
    .refine((value) => !value || isValidHexColor(value), "Couleur invalide (format attendu : #rrggbb)."),
  fontFamily: z
    .string()
    .trim()
    .optional()
    .default("")
    .refine((value) => !value || isValidFontFamily(value), "Police invalide (ex. Georgia, serif)."),
  favicon: z.string().trim().optional().default(""),
  emailFromName: z
    .string()
    .trim()
    .optional()
    .default("")
    .refine((value) => !value || EMAIL_FROM_NAME_REGEX.test(value), "Nom d'expéditeur invalide."),
  hideOriginBranding: z
    .enum(["true", "false"])
    .optional()
    .default("false")
    .transform((value) => value === "true"),
})

const DOMAIN_REGEX = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/

export const customDomainSchema = z.object({
  organizationId: idSchema,
  customDomain: z
    .string()
    .trim()
    .toLowerCase()
    .optional()
    .default("")
    .refine((value) => !value || value.length <= 255, "Domaine trop long.")
    .refine((value) => !value || DOMAIN_REGEX.test(value), "Domaine invalide (ex. app.mondomaine.com)."),
})

export const rolePermissionToggleSchema = z.object({
  roleId: idSchema,
  permissionId: idSchema,
  granted: z.boolean(),
})

const MAX_ROLE_NAME_LENGTH = 100

export const createRoleSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis.").max(MAX_ROLE_NAME_LENGTH, "Le nom est trop long."),
})

const NOTIFICATION_CATEGORY_KEYS = Object.keys(NOTIFICATION_CATEGORIES) as [string, ...string[]]

export const notificationPreferenceSchema = z.object({
  category: z.enum(NOTIFICATION_CATEGORY_KEYS, { message: "Catégorie invalide." }),
  channel: z.enum(["email", "push", "inApp"], { message: "Canal invalide." }),
  enabled: z.boolean(),
})

export const featureFlagToggleSchema = z.object({
  organizationId: idSchema,
  key: idSchema,
  enabled: z.boolean(),
})
