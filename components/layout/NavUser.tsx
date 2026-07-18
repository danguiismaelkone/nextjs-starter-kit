"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { BookText, ChevronsUpDown, CreditCard, LogOut, Settings, User as UserIcon } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"

export interface NavUserData {
  name: string
  email: string
  image?: string | null
}

interface NavUserProps {
  user: NavUserData
  /** Affiche « Facturation » — même garde que l'entrée équivalente de la sidebar (`/billing` est owner/admin-only). */
  canAccessAdmin?: boolean
}

export function NavUser({ user, canAccessAdmin }: NavUserProps) {
  const router = useRouter()
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
              <Avatar className="h-8 w-8 rounded-lg">
                {user.image ? <AvatarImage src={user.image} alt={user.name} /> : null}
                <AvatarFallback className="rounded-lg">{initials || "U"}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{user.name}</span>
                <span className="truncate text-xs text-muted-foreground">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width) min-w-56" side="top" align="start">
            <DropdownMenuLabel className="flex flex-col">
              <span className="font-medium">{user.name}</span>
              <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <UserIcon className="mr-2 h-4 w-4" /> Profil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings className="mr-2 h-4 w-4" /> Paramètres
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {canAccessAdmin && (
              <DropdownMenuItem asChild>
                <Link href="/billing">
                  <CreditCard className="mr-2 h-4 w-4" /> Facturation
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <Link href="/docs">
                <BookText className="mr-2 h-4 w-4" /> Documentation API
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => authClient.signOut().then(() => router.push("/login"))}>
              <LogOut className="mr-2 h-4 w-4" /> Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
