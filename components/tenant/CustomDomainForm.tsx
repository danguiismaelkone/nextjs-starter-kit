"use client"

import { useActionState } from "react"
import { updateCustomDomainAction, type ActionState } from "@/app/(protected)/settings/organizations/[id]/domain/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const initialState: ActionState = {}

interface CustomDomainFormProps {
  organization: {
    id: string
    customDomain: string | null
  }
  /** Cible du CNAME (`lib/domains.ts#platformHostname`) — dérivée de `BETTER_AUTH_URL`. */
  cnameTarget: string
}

export function CustomDomainForm({ organization, cnameTarget }: CustomDomainFormProps) {
  const [state, formAction, isPending] = useActionState(updateCustomDomainAction, initialState)

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-6">
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="organizationId" value={organization.id} />

          <div className="flex flex-col gap-2">
            <Label htmlFor="customDomain">Domaine personnalisé</Label>
            <Input
              id="customDomain"
              name="customDomain"
              placeholder="app.mondomaine.com"
              defaultValue={organization.customDomain ?? ""}
              aria-invalid={!!state.fieldErrors?.customDomain}
            />
            <p className="text-xs text-muted-foreground">
              Vide = accès uniquement via le domaine par défaut de la plateforme.
            </p>
            {state.fieldErrors?.customDomain && (
              <p className="text-sm text-destructive">{state.fieldErrors.customDomain}</p>
            )}
          </div>

          <div className="flex flex-col gap-1 rounded-lg border bg-muted/30 p-3 text-sm">
            <p className="font-medium">Configuration DNS requise</p>
            <p className="text-muted-foreground">
              Créez un enregistrement <strong>CNAME</strong> chez votre fournisseur DNS, pointant votre domaine vers :
            </p>
            <code className="w-fit rounded bg-muted px-2 py-1 font-mono text-xs">{cnameTarget}</code>
            <p className="text-xs text-muted-foreground">
              La propagation DNS peut prendre jusqu&apos;à 24h. Le certificat TLS du domaine est provisionné
              automatiquement une fois le CNAME actif.
            </p>
          </div>

          {state.formError && (
            <p role="alert" className="text-sm text-destructive">
              {state.formError}
            </p>
          )}

          {state.success && <p className="text-sm text-muted-foreground">Domaine mis à jour.</p>}

          <Button type="submit" disabled={isPending} className="w-fit">
            {isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
