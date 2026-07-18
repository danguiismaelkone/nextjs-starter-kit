"use client"

import { useActionState, useState } from "react"
import { updateBrandingAction, type BrandingActionState } from "@/app/(protected)/settings/organizations/[id]/branding/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { LogoUpload } from "@/components/tenant/LogoUpload"
import { isValidHexColor } from "@/lib/theme"

const initialState: BrandingActionState = {}
const DEFAULT_SWATCH_COLOR = "#000000"

interface BrandingFormProps {
  organization: {
    id: string
    logo: string | null
    primaryColor: string | null
    fontFamily: string | null
    favicon: string | null
    emailFromName: string | null
    hideOriginBranding: boolean
  }
  /** Plan White Label (ITEM-069, `isWhiteLabelOrganization`) — sinon `hideOriginBranding` reste désactivé. */
  isWhiteLabel: boolean
}

export function BrandingForm({ organization, isWhiteLabel }: BrandingFormProps) {
  const [state, formAction, isPending] = useActionState(updateBrandingAction, initialState)
  const [primaryColor, setPrimaryColor] = useState(organization.primaryColor ?? "")
  const [hideOriginBranding, setHideOriginBranding] = useState(isWhiteLabel && organization.hideOriginBranding)

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="organizationId" value={organization.id} />

          <div className="flex flex-col gap-2">
            <Label>Logo</Label>
            <LogoUpload organizationId={organization.id} logo={organization.logo} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="primaryColor">Couleur primaire</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                aria-label="Sélecteur de couleur primaire"
                value={isValidHexColor(primaryColor) ? primaryColor : DEFAULT_SWATCH_COLOR}
                onChange={(event) => setPrimaryColor(event.target.value)}
                className="h-8 w-10 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
              />
              <Input
                id="primaryColor"
                name="primaryColor"
                placeholder="#0f172a"
                value={primaryColor}
                onChange={(event) => setPrimaryColor(event.target.value)}
                aria-invalid={!!state.fieldErrors?.primaryColor}
              />
              {primaryColor && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setPrimaryColor("")}>
                  Réinitialiser
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Format hexadécimal (ex. #0f172a). Vide = thème par défaut de l&apos;application.
            </p>
            {state.fieldErrors?.primaryColor && (
              <p className="text-sm text-destructive">{state.fieldErrors.primaryColor}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="fontFamily">Typographie</Label>
            <Input
              id="fontFamily"
              name="fontFamily"
              placeholder="Georgia, serif"
              defaultValue={organization.fontFamily ?? ""}
              aria-invalid={!!state.fieldErrors?.fontFamily}
            />
            <p className="text-xs text-muted-foreground">
              Valeur CSS <code>font-family</code>. Vide = police par défaut de l&apos;application.
            </p>
            {state.fieldErrors?.fontFamily && (
              <p className="text-sm text-destructive">{state.fieldErrors.fontFamily}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="favicon">Favicon (URL)</Label>
            <Input
              id="favicon"
              name="favicon"
              type="url"
              placeholder="https://…/favicon.png"
              defaultValue={organization.favicon ?? ""}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="emailFromName">Nom d&apos;expéditeur des e-mails</Label>
            <Input
              id="emailFromName"
              name="emailFromName"
              placeholder="Acme Support"
              defaultValue={organization.emailFromName ?? ""}
              aria-invalid={!!state.fieldErrors?.emailFromName}
            />
            <p className="text-xs text-muted-foreground">
              Utilisé pour les invitations envoyées au nom de l&apos;organisation. L&apos;adresse d&apos;envoi
              elle-même reste celle de la plateforme.
            </p>
            {state.fieldErrors?.emailFromName && (
              <p className="text-sm text-destructive">{state.fieldErrors.emailFromName}</p>
            )}
          </div>

          <input type="hidden" name="hideOriginBranding" value={hideOriginBranding ? "true" : "false"} />
          <div className="flex items-center gap-3">
            <Switch
              id="hideOriginBranding"
              checked={hideOriginBranding}
              disabled={!isWhiteLabel}
              onCheckedChange={setHideOriginBranding}
            />
            <div>
              <Label htmlFor="hideOriginBranding">Masquer la marque d&apos;origine</Label>
              <p className="text-xs text-muted-foreground">
                {isWhiteLabel
                  ? "Le nom de la plateforme n'apparaît plus dans les mentions par défaut."
                  : "Réservé aux organisations sur le plan White Label."}
              </p>
            </div>
          </div>

          {state.formError && (
            <p role="alert" className="text-sm text-destructive">
              {state.formError}
            </p>
          )}

          {state.success && <p className="text-sm text-muted-foreground">Branding mis à jour.</p>}

          <Button type="submit" disabled={isPending} className="w-fit">
            {isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
