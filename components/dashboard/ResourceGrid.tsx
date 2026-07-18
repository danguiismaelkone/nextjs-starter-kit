import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { resources } from "@/lib/dashboard-content"

export function ResourceGrid() {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold tracking-tight">Ressources</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {resources.map((item) => (
          <Link key={item.title} href={item.href}>
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardContent className="flex h-full flex-col gap-2 pt-6">
                <div className="w-fit rounded-lg bg-muted p-2 text-muted-foreground">
                  <item.icon className="h-5 w-5" />
                </div>
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
