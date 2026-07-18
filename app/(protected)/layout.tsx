import type { Metadata } from "next"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { getCurrentOrganization, listUserOrganizations } from "@/lib/organization"
import { hasPermission } from "@/lib/permissions"
import { buildBrandingStyle } from "@/lib/theme"
import { AppSidebar } from "@/components/layout/AppSidebar"
import { ImpersonationBanner } from "@/components/layout/ImpersonationBanner"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"

/**
 * Favicon personnalisé (ITEM-069, critère 1 — pas de garde de plan, comme le
 * reste du branding ITEM-049) et titre de page (critère 2 — seulement quand
 * `hideOriginBranding` est activé, réservé au plan White Label, voir
 * `updateBrandingAction`) : sinon le favicon/titre par défaut de la
 * plateforme (`app/layout.tsx`) reste inchangé.
 */
export async function generateMetadata(): Promise<Metadata> {
  const organization = await getCurrentOrganization()
  if (!organization) return {}

  return {
    ...(organization.hideOriginBranding ? { title: organization.name } : {}),
    ...(organization.favicon ? { icons: { icon: organization.favicon } } : {}),
  }
}

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session?.user) redirect("/login")

  const user = session.user

  const [cookieStore, organizations, currentOrganization] = await Promise.all([
    cookies(),
    listUserOrganizations(),
    getCurrentOrganization(),
  ])
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false"

  // Même permission que `requireAdmin()` (ITEM-018) : le lien "Administration"
  // de la sidebar doit rester cohérent avec ce que l'utilisateur peut
  // effectivement ouvrir, pas avec l'ancien champ global `User.role`.
  const canAccessAdmin = currentOrganization
    ? await hasPermission(user.id, currentOrganization.id, "admin", "access")
    : false

  // Couleur/typographie de marque de l'organisation active (ITEM-049,
  // ITEM-069) : surcharge `--primary`/`--primary-foreground`/`--font-sans`
  // sur tout le sous-arbre protégé, sans toucher aux pages publiques (login,
  // etc.) ni au thème par défaut si l'organisation n'a rien personnalisé.
  const brandingStyle = buildBrandingStyle(currentOrganization?.primaryColor, currentOrganization?.fontFamily)

  // Rôle système plateforme (ITEM-050), indépendant de `canAccessAdmin`
  // (RBAC scoped à l'organisation active) : condition le lien "Super-admin"
  // de la sidebar, cohérent avec `requireSuperAdmin()`.
  const isSuperAdmin = user.role === "superadmin"

  return (
    <SidebarProvider defaultOpen={defaultOpen} style={brandingStyle}>
      <AppSidebar
        user={{ name: user.name ?? "Utilisateur", email: user.email, image: user.image }}
        canAccessAdmin={canAccessAdmin}
        isSuperAdmin={isSuperAdmin}
        organizations={organizations}
        activeOrganizationId={currentOrganization?.id ?? null}
      />
      <SidebarInset>
        <ImpersonationBanner />
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
