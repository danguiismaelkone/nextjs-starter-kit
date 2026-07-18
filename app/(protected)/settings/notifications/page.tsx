import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { getNotificationPreferences } from "@/lib/notification-preferences"
import { NotificationSection } from "@/components/settings/NotificationSection"
import { PageHeader } from "@/components/layout/PageHeader"
import { DetailPageLayout } from "@/components/layout/DetailPageLayout"

export default async function NotificationsSettingsPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")

  const preferences = await getNotificationPreferences(session.user.id)

  return (
    <div className="max-w-lg">
      <DetailPageLayout
        breadcrumbs={[{ label: "Paramètres", href: "/settings" }]}
        header={
          <PageHeader
            title="Préférences en matière de communication"
            description="Personnalisez les e-mails, notifications push et in-app que vous recevez."
          />
        }
      >
        <NotificationSection preferences={preferences} />
      </DetailPageLayout>
    </div>
  )
}
