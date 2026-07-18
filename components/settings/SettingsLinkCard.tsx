import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface SettingsLinkCardProps {
  href: string
  icon: LucideIcon
  title: string
  description: string
}

/** Carte de navigation (icône + titre + description) du hub `/settings` (ITEM-082). */
export function SettingsLinkCard({ href, icon: Icon, title, description }: SettingsLinkCardProps) {
  return (
    <Link href={href} className="block h-full">
      <Card className="h-full transition-colors hover:bg-muted/50">
        <CardContent className="flex items-start gap-3 pt-6">
          <div className="rounded-md bg-muted p-2">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-primary">{title}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
