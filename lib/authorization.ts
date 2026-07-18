import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { getCurrentOrganization } from "@/lib/organization"
import { hasPermission } from "@/lib/permissions"

/**
 * Garde d'accès aux pages d'administration (`/admin/users`, `/admin/invitations`).
 * Vérifie la permission `admin:access` dans l'organisation active de
 * l'utilisateur, via le RBAC par organisation (ITEM-018 — `Role`/`Permission`
 * scoped à l'organisation), plutôt que l'ancien champ global `User.role`.
 *
 * Remplace l'ancienne vérification `session.user.role === "admin"`, qui ne
 * reflétait plus la réalité multi-tenant depuis l'onboarding par organisation
 * (ITEM-014) : un utilisateur devenu `owner` de sa propre organisation à
 * l'inscription garde `User.role = "user"` par défaut (ce champ global n'est
 * jamais mis à jour par ce flux), et se retrouvait donc bloqué de sa propre
 * console d'administration malgré son rôle réel dans son organisation.
 */
export async function requireAdmin() {
  const session = await getSession()
  if (!session?.user) redirect("/login")

  const organization = await getCurrentOrganization()
  if (!organization) redirect("/dashboard")

  const allowed = await hasPermission(session.user.id, organization.id, "admin", "access")
  if (!allowed) redirect("/dashboard")

  return session
}

/**
 * Garde d'accès à la console super-admin (`/superadmin`, ITEM-050) — rôle
 * système plateforme (`User.role === "superadmin"`, plugin Better Auth
 * `admin`), volontairement indépendant de toute organisation : contrairement à
 * `requireAdmin()` (RBAC scoped à l'organisation active), le super-admin
 * opère sur l'ensemble des organisations et n'a pas besoin d'appartenir à
 * celle qu'il consulte.
 */
export async function requireSuperAdmin() {
  const session = await getSession()
  if (!session?.user) redirect("/login")

  if (session.user.role !== "superadmin") redirect("/dashboard")

  return session
}
