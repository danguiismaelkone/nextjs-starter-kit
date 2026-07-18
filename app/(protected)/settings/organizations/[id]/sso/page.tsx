import { notFound, redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { SsoSettingsForm } from "@/components/tenant/SsoSettingsForm"
import { PageHeader } from "@/components/layout/PageHeader"
import { DetailPageLayout } from "@/components/layout/DetailPageLayout"

interface SsoSettingsPageProps {
  params: Promise<{ id: string }>
}

/** Réglages SSO SAML/OIDC de l'organisation (ITEM-065, Enterprise). */
export default async function SsoSettingsPage({ params }: SsoSettingsPageProps) {
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

  // Seuls owner/admin de l'organisation éditent ces réglages — même règle que
  // les autres paramètres d'organisation (ITEM-017).
  if (membership.role !== "owner" && membership.role !== "admin") redirect("/dashboard")

  const providers = await prisma.ssoProvider.findMany({
    where: { organizationId: id },
    select: { providerId: true, issuer: true, domain: true, oidcConfig: true },
    orderBy: { providerId: "asc" },
  })

  return (
    <div className="max-w-2xl">
      <DetailPageLayout
        breadcrumbs={[{ label: "Paramètres de l'organisation", href: `/settings/organizations/${id}` }]}
        header={
          <PageHeader
            title="Connexion SSO (SAML / OIDC)"
            description={`Connectez le fournisseur d'identité de ${membership.organization.name} — les employés se connectent avec leurs identifiants d'entreprise.`}
          />
        }
      >
        <SsoSettingsForm
          organizationId={id}
          ssoDefaultRole={membership.organization.ssoDefaultRole}
          ssoEnforced={membership.organization.ssoEnforced}
          providers={providers.map((provider) => ({
            providerId: provider.providerId,
            issuer: provider.issuer,
            domain: provider.domain,
            type: provider.oidcConfig ? ("oidc" as const) : ("saml" as const),
          }))}
        />
      </DetailPageLayout>
    </div>
  )
}
