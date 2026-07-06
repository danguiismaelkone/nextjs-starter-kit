"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  InvitationsTable,
  type AdminInvitation,
} from "@/components/admin/invitations-columns"
import { UsersTable, type AdminUser } from "@/components/admin/users-columns"

type TabValue = "users" | "invitations"

function parseTab(value: string | null): TabValue {
  return value === "invitations" ? "invitations" : "users"
}

/**
 * Unified Users/Invitations view (ITEM-015): two tabs on `/admin/users` instead
 * of two separate pages. The active tab is mirrored in the `?tab=` query param so
 * a direct link, a refresh, or the browser Back button all land on the right tab.
 * Local state drives the switch instantly; the URL is updated in the background.
 */
export function UsersTabs({
  users,
  invitations,
  currentUserId,
}: {
  users: AdminUser[]
  invitations: AdminInvitation[]
  currentUserId: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const urlTab = parseTab(searchParams.get("tab"))

  const [tab, setTab] = React.useState<TabValue>(urlTab)

  // Follow the URL when it changes outside a trigger click (Back/Forward, deep link).
  React.useEffect(() => {
    setTab(urlTab)
  }, [urlTab])

  function handleTabChange(value: string) {
    const next = parseTab(value)
    setTab(next)

    const params = new URLSearchParams(searchParams)
    if (next === "users") params.delete("tab")
    else params.set("tab", next)
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  return (
    <Tabs value={tab} onValueChange={handleTabChange}>
      <TabsList>
        <TabsTrigger value="users">
          Utilisateurs
          <span className="text-xs text-muted-foreground">{users.length}</span>
        </TabsTrigger>
        <TabsTrigger value="invitations">
          Invitations
          <span className="text-xs text-muted-foreground">
            {invitations.length}
          </span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="users">
        <UsersTable users={users} currentUserId={currentUserId} />
      </TabsContent>

      <TabsContent value="invitations">
        <InvitationsTable invitations={invitations} />
      </TabsContent>
    </Tabs>
  )
}
