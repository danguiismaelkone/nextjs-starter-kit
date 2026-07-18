"use client"

import { useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Box, Check, ChevronsUpDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { OrganizationSummary } from "@/lib/organization"
import { switchOrganizationAction } from "@/lib/organization-actions"

interface OrgSwitcherProps {
  organizations: OrganizationSummary[]
  activeOrganizationId: string | null
}

export function OrgSwitcher({ organizations, activeOrganizationId }: OrgSwitcherProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const active = organizations.find((org) => org.id === activeOrganizationId) ?? organizations[0]

  const brand = (
    <>
      {active?.logo ? (
        // eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire (route interne), pas une ressource optimisable par next/image
        <img src={active.logo} alt="" className="size-6 shrink-0 rounded-md object-contain" />
      ) : (
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Box className="size-4" />
        </span>
      )}
      <span className="truncate font-serif text-lg group-data-[collapsible=icon]:hidden">
        {active?.name ?? "nextjs-starter-kit"}
      </span>
    </>
  )

  // Une seule organisation : sélecteur discret, pas de dropdown ni d'affordance
  // de changement — juste un lien vers le dashboard, comme avant ITEM-015.
  if (organizations.length <= 1) {
    return (
      <Link
        href="/dashboard"
        className="flex min-w-0 items-center gap-2 text-sidebar-foreground group-data-[collapsible=icon]:justify-center"
      >
        {brand}
      </Link>
    )
  }

  function handleSelect(organizationId: string) {
    if (organizationId === active?.id) return
    startTransition(async () => {
      const result = await switchOrganizationAction(organizationId)
      if (!result.error) router.refresh()
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={isPending}
          className="flex min-w-0 flex-1 items-center gap-2 text-sidebar-foreground group-data-[collapsible=icon]:justify-center"
        >
          {brand}
          <ChevronsUpDown className="ml-auto size-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" side="bottom" align="start">
        <DropdownMenuLabel>Organisations</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {organizations.map((org) => (
          <DropdownMenuItem key={org.id} onClick={() => handleSelect(org.id)}>
            <span className="flex-1 truncate">{org.name}</span>
            {org.id === active?.id && <Check className="ml-2 size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
