"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export interface ListPageTab {
  href: string
  label: string
}

interface ListPageTabsProps {
  tabs: ListPageTab[]
}

/**
 * Onglets de navigation entre pages liées à une même ressource (ITEM-077) —
 * ce sont de vraies pages distinctes (routes différentes), pas un composant
 * `Tabs` qui basculerait un panneau sur la même page : de simples liens
 * stylés, actifs selon la route courante (même logique que `AppSidebar`).
 */
export function ListPageTabs({ tabs }: ListPageTabsProps) {
  const pathname = usePathname()

  return (
    <nav className="flex gap-4 border-b" aria-label="Pages liées">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "border-b-2 px-1 pb-2 text-sm font-medium transition-colors",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
