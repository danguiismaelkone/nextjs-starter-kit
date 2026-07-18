"use client"

import { Fragment, useLayoutEffect, useRef, useState } from "react"
import { MoreHorizontalIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { PageHeaderAction } from "@/components/layout/PageHeader"
import { cn } from "@/lib/utils"

/**
 * Repli en menu (ITEM-085) mesuré réellement, pas déduit d'un point de
 * rupture viewport : la colonne d'actions ne fait qu'un tiers de la largeur
 * de l'en-tête, donc "il y a de la place sur `sm:`" ne dit rien de si CES
 * actions y tiennent (constaté sur `/documents`, 3 actions qui débordaient
 * hors de la colonne malgré `sm:` déjà actif). `scrollWidth` n'est PAS fiable
 * ici : la rangée visible est alignée à droite (`justify-end`), donc son
 * dépassement se produit vers le DÉBUT (la gauche) — hors du sens de défilement
 * que `scrollWidth` sait représenter en LTR, il rapporte alors la même valeur
 * que `clientWidth` même en cas de débordement réel (repéré en instrumentant
 * `/documents` à 700px : aucun repli déclenché alors que les boutons
 * débordaient visiblement). On mesure donc l'empan naturel réel via les
 * rects du premier et dernier bouton (source order, indépendant de l'aligne-
 * ment visuel et non affecté par `overflow-hidden`, qui ne change que le
 * rendu, jamais la position/geometrie calculée des enfants).
 */
export function PageHeaderActions({ actions }: { actions: PageHeaderAction[] }) {
  const rowRef = useRef<HTMLDivElement>(null)
  const [collapsed, setCollapsed] = useState(false)

  useLayoutEffect(() => {
    const row = rowRef.current
    if (!row) return

    const check = () => {
      const children = row.children
      if (children.length === 0) return
      const available = row.getBoundingClientRect().width
      const first = children[0].getBoundingClientRect()
      const last = children[children.length - 1].getBoundingClientRect()
      const needed = last.right - first.left
      setCollapsed(needed > available + 1)
    }
    check()

    const observer = new ResizeObserver(check)
    observer.observe(row)
    return () => observer.disconnect()
  }, [actions])

  if (actions.length === 1) {
    return <div className="flex items-center gap-2 sm:col-span-1 sm:justify-end">{actions[0].content}</div>
  }

  return (
    <div className="grid min-w-0 sm:col-span-1">
      <div
        ref={rowRef}
        className={cn(
          "col-start-1 row-start-1 flex w-full min-w-0 flex-nowrap items-center gap-2 overflow-hidden",
          collapsed ? "invisible" : "justify-end"
        )}
      >
        {actions.map((action) => (
          <Fragment key={action.key}>{action.content}</Fragment>
        ))}
      </div>
      {collapsed && (
        <div className="col-start-1 row-start-1 flex items-center justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Plus d'actions">
                <MoreHorizontalIcon className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="flex flex-col gap-1">
              {actions.map((action) => (
                <div key={action.key} className="px-1 py-0.5">
                  {action.content}
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  )
}
