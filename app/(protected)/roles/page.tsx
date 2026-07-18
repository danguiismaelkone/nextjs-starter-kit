import Link from "next/link"
import { requireAdmin } from "@/lib/authorization"
import { requireOrganization } from "@/lib/organization"
import { isEnterpriseOrganization } from "@/lib/billing"
import { prisma } from "@/lib/prisma"
import { CreateRoleDialog } from "./CreateRoleDialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PageHeader } from "@/components/layout/PageHeader"

export default async function RolesPage() {
  await requireAdmin()
  const organization = await requireOrganization()

  const [roles, enterprise] = await Promise.all([
    prisma.role.findMany({
      where: { organizationId: organization.id },
      include: { _count: { select: { permissions: true } } },
      orderBy: { createdAt: "asc" },
    }),
    isEnterpriseOrganization(organization.id),
  ])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Rôles"
        description={`Permissions par rôle pour ${organization.name}`}
        actions={
          enterprise ? (
            <CreateRoleDialog />
          ) : (
            <div className="flex flex-col items-end gap-1">
              <Button size="sm" variant="outline" disabled>
                Créer un rôle
              </Button>
              <p className="text-xs text-muted-foreground">Réservé au plan Enterprise</p>
            </div>
          )
        }
      />

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rôle</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((role) => (
              <TableRow key={role.id}>
                <TableCell className="font-medium">{role.name}</TableCell>
                <TableCell>
                  <Badge variant={role.isSystem ? "secondary" : "outline"}>
                    {role.isSystem ? "Système" : "Personnalisé"}
                  </Badge>
                </TableCell>
                <TableCell>{role._count.permissions}</TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/roles/${role.id}`}>Modifier</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
