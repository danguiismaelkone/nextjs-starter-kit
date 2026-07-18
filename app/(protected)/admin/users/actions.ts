"use server"

import { revalidatePath, revalidateTag } from "next/cache"
import { APIError } from "better-auth"
import { auth, getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/authorization"
import { requireOrganization } from "@/lib/organization"
import { hasPermission } from "@/lib/permissions"
import { logAudit } from "@/lib/audit"
import { zodFieldErrors } from "@/lib/validation"
import { createUserSchema, MIN_PASSWORD_LENGTH, nameSchema, roleSchema } from "@/lib/validators/admin"
import { DASHBOARD_CACHE_PROFILE, dashboardStatsTag } from "@/lib/cache"
import type { DataTableFetchContext, DataTableImportResult, DataTablePage } from "@/components/data-table/DataTable"
import { USERS_PAGE_SIZE } from "./page-size"

/** Colonnes triables de `/admin/users` (ITEM-076) — clé de colonne DataTable → champ Prisma. */
const SORTABLE_FIELDS = {
  name: "name",
  email: "email",
  createdAt: "createdAt",
} as const satisfies Record<string, "name" | "email" | "createdAt">

const SIGN_UP_ERROR_MESSAGES: Record<string, string> = {
  USER_ALREADY_EXISTS: "Un compte existe déjà avec cet e-mail.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Un compte existe déjà avec cet e-mail.",
  INVALID_EMAIL: "Adresse e-mail invalide.",
  PASSWORD_TOO_SHORT: `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`,
  PASSWORD_TOO_LONG: "Le mot de passe est trop long.",
}

export interface ActionState {
  success?: boolean
  formError?: string
  fieldErrors?: Record<string, string>
}

/** Vrai si `userId` est membre actif de `organizationId` (ITEM-016) — un admin ne
 * doit jamais pouvoir agir sur un utilisateur d'une autre organisation, même en
 * devinant son id (pas seulement le cacher de la liste). */
async function isActiveMember(organizationId: string, userId: string) {
  const membership = await prisma.membership.findFirst({
    where: { organizationId, userId, status: "active" },
  })
  return !!membership
}

export async function createUserAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin()
  const organization = await requireOrganization()

  const parsed = createUserSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { fieldErrors: zodFieldErrors(parsed.error) }
  }
  const { name, email, password, role } = parsed.data

  try {
    const result = await auth.api.signUpEmail({ body: { name, email, password } })

    if (role === "admin") {
      await prisma.user.update({ where: { id: result.user.id }, data: { role } })
    }
    // Rattache le compte créé à l'organisation active de l'admin (ITEM-016) —
    // sans ça, un utilisateur créé ici n'apparaîtrait dans aucune liste scoped-org.
    await prisma.membership.create({
      data: {
        userId: result.user.id,
        organizationId: organization.id,
        role: role === "admin" ? "admin" : "member",
        status: "active",
      },
    })
    // L'inscription crée une session pour le nouvel utilisateur : on la supprime,
    // c'est l'admin qui crée le compte, pas l'utilisateur qui se connecte.
    await prisma.session.deleteMany({ where: { userId: result.user.id } })
  } catch (err) {
    if (err instanceof APIError) {
      return { formError: SIGN_UP_ERROR_MESSAGES[err.body?.code ?? ""] ?? err.body?.message ?? "Une erreur est survenue." }
    }
    return { formError: "Une erreur est survenue, veuillez réessayer." }
  }

  // Un membre de plus change `totalUsers`/`newUsersThisMonth` (lib/dashboard.ts).
  revalidateTag(dashboardStatsTag(organization.id), DASHBOARD_CACHE_PROFILE)
  revalidatePath("/admin/users")
  return { success: true }
}

export async function updateUserAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin()
  const organization = await requireOrganization()

  const id = String(formData.get("id") ?? "")
  const nameResult = nameSchema.safeParse(formData.get("name"))
  const roleResult = roleSchema.safeParse(formData.get("role") ?? "user")

  const fieldErrors: Record<string, string> = {}
  if (!id) fieldErrors.name = "Utilisateur introuvable."
  if (!nameResult.success) fieldErrors.name = nameResult.error.issues[0]?.message ?? "Le nom est requis."
  if (!roleResult.success) fieldErrors.role = roleResult.error.issues[0]?.message ?? "Rôle invalide."
  if (Object.keys(fieldErrors).length > 0 || !nameResult.success || !roleResult.success) {
    return { fieldErrors }
  }

  if (!(await isActiveMember(organization.id, id))) {
    return { fieldErrors: { name: "Utilisateur introuvable." } }
  }

  await prisma.user.update({ where: { id }, data: { name: nameResult.data, role: roleResult.data } })

  revalidatePath("/admin/users")
  return { success: true }
}

export async function setUserDisabledAction(id: string, disabled: boolean): Promise<ActionState> {
  const session = await requireAdmin()
  const organization = await requireOrganization()

  if (id === session.user.id) {
    return { formError: "Vous ne pouvez pas désactiver votre propre compte." }
  }

  if (!(await isActiveMember(organization.id, id))) {
    return { formError: "Utilisateur introuvable." }
  }

  await prisma.user.update({ where: { id }, data: { disabledAt: disabled ? new Date() : null } })
  if (disabled) {
    await prisma.session.deleteMany({ where: { userId: id } })
  }

  revalidatePath("/admin/users")
  return { success: true }
}

/**
 * Retire un membre de l'organisation active (ITEM-016) : soft-delete de la
 * `Membership` (status "removed"), le compte utilisateur global n'est jamais
 * touché — il peut appartenir à d'autres organisations, ou en rejoindre une
 * nouvelle plus tard.
 */
export async function removeMemberAction(id: string): Promise<ActionState> {
  const session = await requireAdmin()
  const organization = await requireOrganization()

  if (id === session.user.id) {
    return { formError: "Vous ne pouvez pas vous retirer vous-même de l'organisation." }
  }

  const membership = await prisma.membership.findFirst({
    where: { organizationId: organization.id, userId: id, status: "active" },
  })
  if (!membership) {
    return { formError: "Utilisateur introuvable." }
  }

  const activeMemberCount = await prisma.membership.count({
    where: { organizationId: organization.id, status: "active" },
  })
  if (activeMemberCount <= 1) {
    return { formError: "Impossible de retirer le dernier membre de l'organisation." }
  }

  await prisma.membership.update({ where: { id: membership.id }, data: { status: "removed" } })

  await logAudit({
    organizationId: organization.id,
    actorId: session.user.id,
    action: "membership.removed",
    targetType: "User",
    targetId: id,
  })

  // Un membre de moins change `totalUsers`/`newUsersThisMonth` (lib/dashboard.ts).
  revalidateTag(dashboardStatsTag(organization.id), DASHBOARD_CACHE_PROFILE)
  revalidatePath("/admin/users")
  return { success: true }
}

export interface UserRow {
  id: string
  name: string
  email: string
  role: string
  disabledAt: Date | null
  createdAt: Date
}

/**
 * Page de la liste des utilisateurs d'une organisation (ITEM-061, pagination
 * serveur ; ITEM-076, tri + filtres ; ITEM-079, recherche intégrée) —
 * `organizationId` lié via `.bind(null, organization.id)` côté page (Server
 * Component) avant d'être passée au `DataTable` (Client Component), donc
 * jamais falsifiable depuis le client (argument lié d'une Server Action
 * scellé côté serveur). `sort`/`filters`/`search`, eux, viennent du
 * `DataTable` côté client — pas de données sensibles, une simple restriction
 * supplémentaire de la même requête déjà scopée par organisation.
 */
export async function getUsersPageAction(
  organizationId: string,
  page: number,
  context?: DataTableFetchContext
): Promise<DataTablePage<UserRow>> {
  const session = await getSession()
  if (!session?.user) return { data: [], total: 0 }

  const allowed = await hasPermission(session.user.id, organizationId, "admin", "access")
  if (!allowed) return { data: [], total: 0 }

  const roleFilter = context?.filters.role
  const statusFilter = context?.filters.status
  const search = context?.search

  const where = {
    memberships: { some: { organizationId, status: "active" } },
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(roleFilter ? { role: roleFilter } : {}),
    ...(statusFilter === "active" ? { disabledAt: null } : {}),
    ...(statusFilter === "disabled" ? { disabledAt: { not: null } } : {}),
  }

  const sortField = context?.sort ? SORTABLE_FIELDS[context.sort.columnId as keyof typeof SORTABLE_FIELDS] : undefined
  const orderBy = sortField ? { [sortField]: context!.sort!.direction } : { createdAt: "desc" as const }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy,
      skip: (Math.max(1, page) - 1) * USERS_PAGE_SIZE,
      take: USERS_PAGE_SIZE,
      select: { id: true, name: true, email: true, role: true, disabledAt: true, createdAt: true },
    }),
    prisma.user.count({ where }),
  ])

  return { data: users, total }
}

/**
 * Désactive/réactive plusieurs utilisateurs en une fois (ITEM-076, action
 * groupée du DataTable) — même règles que `setUserDisabledAction` (jamais
 * soi-même, jamais un utilisateur d'une autre organisation), appliquées à un
 * ensemble d'ids plutôt qu'un seul.
 */
export async function bulkSetUsersDisabledAction(ids: string[], disabled: boolean): Promise<ActionState> {
  const session = await requireAdmin()
  const organization = await requireOrganization()

  const targetIds = ids.filter((id) => id !== session.user.id)
  if (targetIds.length === 0) {
    return { formError: "Aucun utilisateur valide (vous ne pouvez pas vous désactiver vous-même)." }
  }

  const memberships = await prisma.membership.findMany({
    where: { organizationId: organization.id, userId: { in: targetIds }, status: "active" },
    select: { userId: true },
  })
  const validIds = memberships.map((membership) => membership.userId)
  if (validIds.length === 0) {
    return { formError: "Utilisateurs introuvables." }
  }

  await prisma.user.updateMany({ where: { id: { in: validIds } }, data: { disabledAt: disabled ? new Date() : null } })
  if (disabled) {
    await prisma.session.deleteMany({ where: { userId: { in: validIds } } })
  }

  revalidatePath("/admin/users")
  return { success: true }
}

/**
 * Import CSV en masse (ITEM-076) — mêmes champs/règles que la création d'un
 * utilisateur unique (`createUserAction`/`createUserSchema` : nom, e-mail,
 * mot de passe, rôle) rejouées ligne par ligne ; ligne en échec journalisée
 * dans le résultat sans bloquer les suivantes.
 */
export async function importUsersAction(rows: Record<string, string>[]): Promise<DataTableImportResult> {
  await requireAdmin()
  const organization = await requireOrganization()

  const errors: string[] = []
  let successCount = 0

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2 // ligne 1 = en-têtes, index 0-based
    const parsed = createUserSchema.safeParse(row)
    if (!parsed.success) {
      errors.push(`Ligne ${rowNumber} : ${parsed.error.issues[0]?.message ?? "ligne invalide"}.`)
      continue
    }
    const { name, email, password, role } = parsed.data

    try {
      const result = await auth.api.signUpEmail({ body: { name, email, password } })
      if (role === "admin") {
        await prisma.user.update({ where: { id: result.user.id }, data: { role } })
      }
      await prisma.membership.create({
        data: {
          userId: result.user.id,
          organizationId: organization.id,
          role: role === "admin" ? "admin" : "member",
          status: "active",
        },
      })
      await prisma.session.deleteMany({ where: { userId: result.user.id } })
      successCount++
    } catch (err) {
      const message =
        err instanceof APIError
          ? (SIGN_UP_ERROR_MESSAGES[err.body?.code ?? ""] ?? err.body?.message ?? "erreur inconnue")
          : "erreur inconnue"
      errors.push(`Ligne ${rowNumber} (${email}) : ${message}.`)
    }
  }

  if (successCount > 0) {
    revalidateTag(dashboardStatsTag(organization.id), DASHBOARD_CACHE_PROFILE)
    revalidatePath("/admin/users")
  }

  return { successCount, errors }
}
