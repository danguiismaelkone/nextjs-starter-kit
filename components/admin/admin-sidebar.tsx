import { AdminNav } from "@/components/admin/admin-nav"

/**
 * Persistent desktop sidebar (hidden on mobile — the topbar exposes the same
 * navigation through a drawer there). ITEM-009.
 */
export function AdminSidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-14 items-center border-b border-sidebar-border px-4 font-semibold">
        Administration
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <AdminNav />
      </div>
    </aside>
  )
}
