"use client"

import { useActionState } from "react"
import Link from "next/link"
import { updateOrganizationAction, type ActionState } from "@/app/(protected)/settings/organizations/[id]/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const initialState: ActionState = {}

interface OrganizationFormProps {
  organization: {
    id: string
    name: string
    slug: string
  }
}

export function OrganizationForm({ organization }: OrganizationFormProps) {
  const [state, formAction, isPending] = useActionState(updateOrganizationAction, initialState)

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-6">
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="organizationId" value={organization.id} />

          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nom</Label>
            <Input
              id="name"
              name="name"
              defaultValue={organization.name}
              aria-invalid={!!state.fieldErrors?.name}
            />
            {state.fieldErrors?.name && <p className="text-sm text-destructive">{state.fieldErrors.name}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="slug">Identifiant (slug)</Label>
            <Input
              id="slug"
              name="slug"
              defaultValue={organization.slug}
              aria-invalid={!!state.fieldErrors?.slug}
            />
            <p className="text-xs text-muted-foreground">
              Minuscules, chiffres et tirets uniquement (ex. mon-organisation).
            </p>
            {state.fieldErrors?.slug && <p className="text-sm text-destructive">{state.fieldErrors.slug}</p>}
          </div>

          {state.formError && (
            <p role="alert" className="text-sm text-destructive">
              {state.formError}
            </p>
          )}

          {state.success && <p className="text-sm text-muted-foreground">Organisation mise à jour.</p>}

          <Button type="submit" disabled={isPending} className="w-fit">
            {isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </form>

        <Link
          href={`/settings/organizations/${organization.id}/branding`}
          className="text-sm text-muted-foreground hover:underline"
        >
          Logo et couleur de marque →
        </Link>

        <Link
          href={`/settings/organizations/${organization.id}/sso`}
          className="text-sm text-muted-foreground hover:underline"
        >
          Connexion SSO (SAML / OIDC) →
        </Link>

        <Link
          href={`/settings/organizations/${organization.id}/domain`}
          className="text-sm text-muted-foreground hover:underline"
        >
          Domaine personnalisé (White Label) →
        </Link>
      </CardContent>
    </Card>
  )
}
