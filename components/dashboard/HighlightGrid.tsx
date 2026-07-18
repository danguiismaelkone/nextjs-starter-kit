import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { highlights } from "@/lib/dashboard-content"

export function HighlightGrid() {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold tracking-tight">Mis en avant</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {highlights.map((item) => (
          <Link key={item.title} href={item.href}>
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardContent className="flex h-full flex-col gap-3 pt-6">
                <div className="w-fit rounded-lg bg-muted p-2 text-muted-foreground">
                  <item.icon className="h-5 w-5" />
                </div>
                <p className="font-medium">{item.title}</p>
                <div className="mt-auto flex flex-wrap gap-1">
                  {item.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
