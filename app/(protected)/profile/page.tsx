import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { AvatarSection } from "@/components/profile/AvatarSection"
import { ProfileForm } from "@/components/profile/ProfileForm"
import { ChangePasswordForm } from "@/components/profile/ChangePasswordForm"
import { TwoFactorSection } from "@/components/settings/TwoFactorSection"
import { SessionsSection } from "@/components/settings/SessionsSection"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { PageHeader } from "@/components/layout/PageHeader"
import { DetailPageLayout, DetailPanelSection } from "@/components/layout/DetailPageLayout"

export default async function ProfilePage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")

  const { user } = session

  return (
    <DetailPageLayout
      header={
        <PageHeader
          title="Informations personnelles"
          description="Gérez vos informations personnelles, votre avatar et votre mot de passe."
        />
      }
      details={
        <DetailPanelSection
          title="Compte"
          fields={[
            { label: "E-mail", value: user.email },
            { label: "Rôle", value: user.role === "superadmin" ? "Super-admin" : "Utilisateur" },
            { label: "Membre depuis", value: user.createdAt.toLocaleDateString("fr-FR") },
          ]}
        />
      }
    >
      <AvatarSection name={user.name ?? "Utilisateur"} image={user.image ?? null} />

      <Card>
        <CardHeader>
          <CardTitle>Utilisateur</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <ProfileForm name={user.name ?? ""} phone={user.phone ?? null} bio={user.bio ?? null} />

          <Separator />

          <ChangePasswordForm />
        </CardContent>
      </Card>

      <TwoFactorSection initialEnabled={user.twoFactorEnabled ?? false} />
      <SessionsSection />
    </DetailPageLayout>
  )
}
