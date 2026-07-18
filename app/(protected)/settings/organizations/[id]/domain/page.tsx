import { notFound, redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { platformHostname } from "@/lib/domains"
import { CustomDomainForm } from "@/components/tenant/CustomDomainForm"
import { PageHeader } from "@/components/layout/PageHeader"
import { DetailPageLayout } from "@/components/layout/DetailPageLayout"

interface DomainSettingsPageProps {
  params: Promise<{ id: string }>
}

export default async function DomainSettingsPage({ params }: DomainSettingsPageProps) {
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

  // Seuls owner/admin de l'organisation éditent ces réglages (même règle que
  // branding/SSO, ITEM-049/ITEM-065).
  if (membership.role !== "owner" && membership.role !== "admin") redirect("/dashboard")

  return (
    <div className="max-w-lg">
      <DetailPageLayout
        breadcrumbs={[{ label: "Paramètres de l'organisation", href: `/settings/organizations/${id}` }]}
        header={
          <PageHeader
            title="Domaine personnalisé"
            description={`Accédez à ${membership.organization.name} depuis votre propre domaine (White Label).`}
          />
        }
      >
        <CustomDomainForm
          organization={{
            id: membership.organization.id,
            customDomain: membership.organization.customDomain,
          }}
          cnameTarget={platformHostname()}
        />
      </DetailPageLayout>
    </div>
  )
}
