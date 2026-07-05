import { requireAdmin } from "@/lib/authorization"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { AdminTopbar } from "@/components/admin/admin-topbar"

/**
 * Shared shell for every `/admin/*` route: admin-only guard, persistent sidebar,
 * and a topbar. Child pages render inside the content area (they keep their own
 * `<main>` landmark). ITEM-009.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Guards the whole admin section: redirects to /login (anonymous) or
  // /dashboard (non-admin). Child pages may keep their own requireAdmin too.
  const user = await requireAdmin()

  return (
    <div className="flex min-h-svh bg-muted/20">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar user={{ name: user.name, email: user.email }} />
        {children}
      </div>
    </div>
  )
}
