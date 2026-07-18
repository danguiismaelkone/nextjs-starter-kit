import { notFound, redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isWhiteLabelOrganization } from "@/lib/billing"
import { BrandingForm } from "@/components/tenant/BrandingForm"
import { PageHeader } from "@/components/layout/PageHeader"
import { DetailPageLayout } from "@/components/layout/DetailPageLayout"

interface BrandingSettingsPageProps {
  params: Promise<{ id: string }>
}

export default async function BrandingSettingsPage({ params }: BrandingSettingsPageProps) {
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

  // Seuls owner/admin de l'organisation éditent ces réglages (critère 1) —
  // même règle que les autres paramètres d'organisation (ITEM-017).
  if (membership.role !== "owner" && membership.role !== "admin") redirect("/dashboard")

  const isWhiteLabel = await isWhiteLabelOrganization(id)

  return (
    <div className="max-w-lg">
      <DetailPageLayout
        breadcrumbs={[{ label: "Paramètres de l'organisation", href: `/settings/organizations/${id}` }]}
        header={
          <PageHeader
            title="Branding"
            description={`Logo, couleur, typographie et favicon affichés dans l'espace de ${membership.organization.name}.`}
          />
        }
      >
        <BrandingForm
          organization={{
            id: membership.organization.id,
            logo: membership.organization.logo,
            primaryColor: membership.organization.primaryColor,
            fontFamily: membership.organization.fontFamily,
            favicon: membership.organization.favicon,
            emailFromName: membership.organization.emailFromName,
            hideOriginBranding: membership.organization.hideOriginBranding,
          }}
          isWhiteLabel={isWhiteLabel}
        />
      </DetailPageLayout>
    </div>
  )
}
