import { redirect } from "next/navigation"
import {
  Building2,
  CreditCard,
  Fingerprint,
  KeyRound,
  Mail,
  MailPlus,
  Palette,
  Globe,
  Receipt,
  ScrollText,
  ShieldCheck,
  Tag,
  User,
  UserCog,
  Users,
  Webhook,
} from "lucide-react"
import { getSession } from "@/lib/auth"
import { getCurrentOrganization } from "@/lib/organization"
import { SettingsSection } from "@/components/settings/SettingsSection"
import { SettingsLinkCard } from "@/components/settings/SettingsLinkCard"
import { PageHeader } from "@/components/layout/PageHeader"

export default async function SettingsPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")

  const organization = await getCurrentOrganization()
  const canManageOrg = organization?.role === "owner" || organization?.role === "admin"

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Paramètres"
        description="Gérez vos préférences, votre compte et les réglages de l'organisation."
      />

      <SettingsSection title="Paramètres personnels">
        <SettingsLinkCard
          href="/profile"
          icon={User}
          title="Informations personnelles"
          description="Coordonnées, avatar et mot de passe."
        />
        <SettingsLinkCard
          href="/profile"
          icon={ShieldCheck}
          title="Sécurité"
          description="Double authentification (2FA) et sessions actives."
        />
      </SettingsSection>

      {canManageOrg && organization && (
        <SettingsSection title="Paramètres du compte">
          <SettingsLinkCard
            href={`/settings/organizations/${organization.id}`}
            icon={Building2}
            title="Organisation"
            description="Nom, identifiant et logo de l'organisation."
          />
          <SettingsLinkCard
            href={`/settings/organizations/${organization.id}/branding`}
            icon={Palette}
            title="Branding"
            description="Logo, couleur, typographie et favicon (White Label)."
          />
          <SettingsLinkCard
            href={`/settings/organizations/${organization.id}/domain`}
            icon={Globe}
            title="Domaine personnalisé"
            description="Accès à l'organisation depuis votre propre domaine."
          />
          <SettingsLinkCard
            href={`/settings/organizations/${organization.id}/sso`}
            icon={Fingerprint}
            title="Connexion SSO"
            description="Authentification SAML / OIDC (Enterprise)."
          />
          <SettingsLinkCard
            href="/roles"
            icon={UserCog}
            title="Rôles"
            description="Permissions accordées à chaque rôle de l'organisation."
          />
          <SettingsLinkCard
            href="/admin/users"
            icon={Users}
            title="Membres"
            description="Utilisateurs de l'organisation, rôles et statuts."
          />
          <SettingsLinkCard
            href="/admin/invitations"
            icon={MailPlus}
            title="Invitations"
            description="Invitations envoyées, acceptées ou révoquées."
          />
          <SettingsLinkCard
            href="/settings/notifications"
            icon={Mail}
            title="Préférences en matière de communication"
            description="Personnalisez les e-mails, notifications push et in-app que vous recevez."
          />
        </SettingsSection>
      )}

      {canManageOrg && (
        <SettingsSection title="Paramètres produit">
          <SettingsLinkCard
            href="/billing"
            icon={CreditCard}
            title="Facturation"
            description="Abonnement et plan de l'organisation."
          />
          <SettingsLinkCard href="/billing/invoices" icon={Receipt} title="Factures" description="Historique des factures." />
          <SettingsLinkCard href="/billing/plans" icon={Tag} title="Tarifs" description="Comparer et changer de plan." />
          <SettingsLinkCard
            href="/settings/api-keys"
            icon={KeyRound}
            title="Clés API"
            description="Génération et révocation des clés API."
          />
          <SettingsLinkCard
            href="/settings/webhooks"
            icon={Webhook}
            title="Webhooks"
            description="Envois signés vers vos systèmes lors d'événements clés."
          />
          <SettingsLinkCard
            href="/settings/audit"
            icon={ScrollText}
            title="Journal d'audit"
            description="Historique des actions sensibles sur l'organisation."
          />
        </SettingsSection>
      )}
    </div>
  )
}
