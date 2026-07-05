import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Consistent page header for admin routes (ITEM-011): an optional back link,
 * a title, an optional description, and a right-aligned actions slot. Purely
 * presentational. Actions wrap below the title on narrow screens.
 */
export function PageHeader({
  title,
  description,
  actions,
  backHref,
  backLabel = "Retour",
  className,
}: {
  title: string
  description?: React.ReactNode
  /** Primary actions (buttons/links), aligned right on desktop. */
  actions?: React.ReactNode
  /** When set, a subtle back link is rendered above the title. */
  backHref?: string
  backLabel?: string
  className?: string
}) {
  return (
    <div className={cn("mb-6", className)}>
      {backHref ? (
        <Link
          href={backHref}
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {backLabel}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {description ? (
            <div className="text-sm text-muted-foreground">{description}</div>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </div>
  )
}
