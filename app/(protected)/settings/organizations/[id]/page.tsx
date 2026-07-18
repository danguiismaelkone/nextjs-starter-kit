import { notFound, redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { OrganizationForm } from "@/components/tenant/OrganizationForm"
import { PageHeader } from "@/components/layout/PageHeader"
import { DetailPageLayout, DetailPanelSection } from "@/components/layout/DetailPageLayout"

interface OrganizationSettingsPageProps {
  params: Promise<{ id: string }>
}

export default async function OrganizationSettingsPage({ params }: OrganizationSettingsPageProps) {
  const session = await getSession()
  if (!session?.user) redirect("/login")

  const { id } = await params

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, organizationId: id, status: "active" },
    include: { organization: true },
  })

  // Organisation inexistante ou dont l'utilisateur n'est pas (ou plus) membre :
  // ni son existence ni ses infos ne doivent fuiter.
  if (!membership) notFound()

  // Seuls owner/admin de l'organisation éditent ces réglages (critère 3) —
  // un simple membre y a accès en lecture via la sidebar mais est renvoyé ici.
  if (membership.role !== "owner" && membership.role !== "admin") redirect("/dashboard")

  return (
    <DetailPageLayout
      breadcrumbs={[{ label: "Paramètres", href: "/settings" }]}
      header={
        <PageHeader
          title="Paramètres de l'organisation"
          description={`Nom, logo et identifiant de ${membership.organization.name}`}
        />
      }
      details={
        <DetailPanelSection
          title="Détails"
          fields={[
            { label: "Identifiant", value: membership.organization.slug },
            { label: "Votre rôle", value: membership.role === "owner" ? "Propriétaire" : "Admin" },
            { label: "Créée le", value: membership.organization.createdAt.toLocaleDateString("fr-FR") },
          ]}
        />
      }
    >
      <OrganizationForm organization={membership.organization} />
    </DetailPageLayout>
  )
}
