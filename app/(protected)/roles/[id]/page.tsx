import { notFound } from "next/navigation"
import { requireAdmin } from "@/lib/authorization"
import { requireOrganization } from "@/lib/organization"
import { prisma } from "@/lib/prisma"
import { PermissionMatrix } from "@/components/roles/PermissionMatrix"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/layout/PageHeader"
import { DetailPageLayout, DetailPanelSection } from "@/components/layout/DetailPageLayout"

interface RoleDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function RoleDetailPage({ params }: RoleDetailPageProps) {
  await requireAdmin()
  const organization = await requireOrganization()
  const { id } = await params

  const role = await prisma.role.findFirst({
    where: { id, organizationId: organization.id },
    include: { permissions: { select: { permissionId: true } } },
  })
  // Rôle inexistant ou d'une autre organisation : ni son existence ni ses
  // permissions ne doivent fuiter (même schéma de garde qu'ITEM-017).
  if (!role) notFound()

  const allPermissions = await prisma.permission.findMany({
    orderBy: [{ resource: "asc" }, { action: "asc" }],
  })

  const resources = Array.from(new Set(allPermissions.map((p) => p.resource))).sort()
  const actions = Array.from(new Set(allPermissions.map((p) => p.action))).sort()
  const permissionIdByKey = Object.fromEntries(
    allPermissions.map((p) => [`${p.resource}:${p.action}`, p.id])
  )
  const grantedKeys = role.permissions
    .map((rp) => allPermissions.find((p) => p.id === rp.permissionId))
    .filter((p): p is (typeof allPermissions)[number] => !!p)
    .map((p) => `${p.resource}:${p.action}`)

  return (
    <DetailPageLayout
      breadcrumbs={[{ label: "Rôles", href: "/roles" }]}
      header={
        <PageHeader
          title={
            <span className="flex items-center gap-2">
              {role.name}
              {role.isSystem && <Badge variant="secondary">Système</Badge>}
            </span>
          }
          description={`Cochez les permissions accordées à ce rôle dans ${organization.name}. Chaque changement est appliqué immédiatement.`}
        />
      }
      details={
        <DetailPanelSection
          title="Détails"
          fields={[
            { label: "Nom", value: role.name },
            { label: "Statut", value: role.isSystem ? "Système" : "Personnalisé" },
            { label: "Créé le", value: role.createdAt.toLocaleDateString("fr-FR") },
            { label: "Mis à jour le", value: role.updatedAt.toLocaleDateString("fr-FR") },
          ]}
        />
      }
    >
      <PermissionMatrix
        roleId={role.id}
        resources={resources}
        actions={actions}
        grantedKeys={grantedKeys}
        permissionIdByKey={permissionIdByKey}
      />
    </DetailPageLayout>
  )
}
