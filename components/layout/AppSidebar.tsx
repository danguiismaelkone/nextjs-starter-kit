"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Building2,
  CreditCard,
  FileText,
  Flag,
  LayoutDashboard,
  Mail,
  PenLine,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { NavUser, type NavUserData } from "./NavUser"
import { OrgSwitcher } from "./OrgSwitcher"
import { NotificationBell } from "@/components/notifications/NotificationBell"
import type { OrganizationSummary } from "@/lib/organization"

const NAV_MAIN = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/ai/chat", label: "Assistant IA", icon: Sparkles },
  { href: "/ai/generate", label: "Génération de texte", icon: PenLine },
]

const NAV_ADMIN = [
  { href: "/admin/users", label: "Utilisateurs", icon: Users },
  { href: "/admin/invitations", label: "Invitations", icon: Mail },
  { href: "/roles", label: "Rôles", icon: ShieldCheck },
  { href: "/billing", label: "Facturation", icon: CreditCard },
]

const NAV_SUPERADMIN = [
  { href: "/superadmin", label: "Organisations", icon: Building2 },
  { href: "/superadmin/users", label: "Comptes", icon: ShieldAlert },
  { href: "/superadmin/flags", label: "Feature flags", icon: Flag },
]

interface AppSidebarProps {
  user: NavUserData
  canAccessAdmin?: boolean
  isSuperAdmin?: boolean
  organizations: OrganizationSummary[]
  activeOrganizationId: string | null
}

export function AppSidebar({
  user,
  canAccessAdmin,
  isSuperAdmin,
  organizations,
  activeOrganizationId,
}: AppSidebarProps) {
  const pathname = usePathname()
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center justify-between gap-2 px-2 py-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <OrgSwitcher organizations={organizations} activeOrganizationId={activeOrganizationId} />
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Rechercher"
              className="group-data-[collapsible=icon]:hidden"
            >
              <Search />
            </Button>
            <NotificationBell />
            <SidebarTrigger />
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarMenu>
            {NAV_MAIN.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={isActive(item.href)} tooltip={item.label}>
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {canAccessAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarMenu>
              {NAV_ADMIN.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive(item.href)} tooltip={item.label}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        )}

        {isSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Super-admin</SidebarGroupLabel>
            <SidebarMenu>
              {NAV_SUPERADMIN.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive(item.href)} tooltip={item.label}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} canAccessAdmin={canAccessAdmin} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
