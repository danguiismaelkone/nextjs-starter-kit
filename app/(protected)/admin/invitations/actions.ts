"use server"

import { randomBytes } from "crypto"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { sendInvitationEmail } from "@/lib/email"
import { requireAdmin } from "@/lib/authorization"
import { requireOrganization } from "@/lib/organization"
import { getSession } from "@/lib/auth"
import { hasPermission } from "@/lib/permissions"
import { zodFieldErrors } from "@/lib/validation"
import { createInvitationSchema } from "@/lib/validators/admin"
import type { DataTableFetchContext, DataTablePage } from "@/components/data-table/DataTable"
import { INVITATIONS_PAGE_SIZE } from "./page-size"

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000

export interface ActionState {
  success?: boolean
  formError?: string
  fieldErrors?: Record<string, string>
}

/** Colonnes triables de `/admin/invitations` (ITEM-080) — clé de colonne DataTable → champ Prisma. */
const SORTABLE_FIELDS = {
  email: "email",
  expiresAt: "expiresAt",
} as const satisfies Record<string, "email" | "expiresAt">

function generateToken() {
  return randomBytes(24).toString("hex")
}

async function sendInvitation(
  email: string,
  role: string,
  inviterName: string,
  organizationId: string,
  fromName?: string | null
) {
  const token = generateToken()
  const expiresAt = new Date(Date.now() + INVITATION_TTL_MS)

  const invitation = await prisma.invitation.create({
    data: { email, role, token, expiresAt, organizationId },
  })

  const url = `${process.env.BETTER_AUTH_URL}/invite/accept?token=${token}`
  await sendInvitationEmail({ to: email, url, inviterName, fromName })

  return invitation
}

export async function createInvitationAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdmin()
  const organization = await requireOrganization()

  const parsed = createInvitationSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { fieldErrors: zodFieldErrors(parsed.error) }
  }
  const { email, role } = parsed.data

  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) {
    return { fieldErrors: { email: "Un compte existe déjà avec cet e-mail." } }
  }

  const existingInvitation = await prisma.invitation.findFirst({
    where: { email, organizationId: organization.id, status: "pending" },
  })
  if (existingInvitation) {
    return { fieldErrors: { email: "Une invitation est déjà en attente pour cet e-mail — utilisez plutôt « Renvoyer »." } }
  }

  await sendInvitation(email, role, session.user.name ?? "Un administrateur", organization.id, organization.emailFromName)

  revalidatePath("/admin/invitations")
  return { success: true }
}

export async function resendInvitationAction(id: string): Promise<ActionState> {
  const session = await requireAdmin()
  const organization = await requireOrganization()

  const invitation = await prisma.invitation.findUnique({ where: { id } })
  if (!invitation || invitation.organizationId !== organization.id || invitation.status !== "pending") {
    return { formError: "Cette invitation n'est plus en attente." }
  }

  const token = generateToken()
  const expiresAt = new Date(Date.now() + INVITATION_TTL_MS)
  await prisma.invitation.update({ where: { id }, data: { token, expiresAt } })

  const url = `${process.env.BETTER_AUTH_URL}/invite/accept?token=${token}`
  await sendInvitationEmail({
    to: invitation.email,
    url,
    inviterName: session.user.name ?? "Un administrateur",
    fromName: organization.emailFromName,
  })

  revalidatePath("/admin/invitations")
  return { success: true }
}

export async function revokeInvitationAction(id: string): Promise<ActionState> {
  await requireAdmin()
  const organization = await requireOrganization()

  const invitation = await prisma.invitation.findUnique({ where: { id } })
  if (!invitation || invitation.organizationId !== organization.id || invitation.status !== "pending") {
    return { formError: "Cette invitation n'est plus en attente." }
  }

  await prisma.invitation.update({ where: { id }, data: { status: "revoked" } })

  revalidatePath("/admin/invitations")
  return { success: true }
}

export interface InvitationRow {
  id: string
  email: string
  role: string
  status: string
  expiresAt: Date
}

/**
 * Page de la liste des invitations d'une organisation (ITEM-080, gabarit CRUD
 * standard — même structure que `getUsersPageAction`) — pagination serveur,
 * tri, filtre par statut et recherche par e-mail intégrée au `DataTable`
 * (ITEM-076/079), là où la page chargeait auparavant `findMany` sans limite.
 */
export async function getInvitationsPageAction(
  organizationId: string,
  page: number,
  context?: DataTableFetchContext
): Promise<DataTablePage<InvitationRow>> {
  const session = await getSession()
  if (!session?.user) return { data: [], total: 0 }

  const allowed = await hasPermission(session.user.id, organizationId, "admin", "access")
  if (!allowed) return { data: [], total: 0 }

  const statusFilter = context?.filters.status
  const search = context?.search

  const where = {
    organizationId,
    ...(search ? { email: { contains: search, mode: "insensitive" as const } } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
  }

  const sortField = context?.sort ? SORTABLE_FIELDS[context.sort.columnId as keyof typeof SORTABLE_FIELDS] : undefined
  const orderBy = sortField ? { [sortField]: context!.sort!.direction } : { createdAt: "desc" as const }

  const [invitations, total] = await Promise.all([
    prisma.invitation.findMany({
      where,
      orderBy,
      skip: (Math.max(1, page) - 1) * INVITATIONS_PAGE_SIZE,
      take: INVITATIONS_PAGE_SIZE,
      select: { id: true, email: true, role: true, status: true, expiresAt: true },
    }),
    prisma.invitation.count({ where }),
  ])

  return { data: invitations, total }
}
