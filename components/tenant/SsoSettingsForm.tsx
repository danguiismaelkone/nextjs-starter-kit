"use client"

import { useActionState, useState } from "react"
import {
  deleteSsoProviderAction,
  registerOidcProviderAction,
  registerSamlProviderAction,
  updateSsoSettingsAction,
  type SsoActionState,
} from "@/app/(protected)/settings/organizations/[id]/sso/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const initialState: SsoActionState = {}

interface SsoProviderSummary {
  providerId: string
  issuer: string
  domain: string
  type: "oidc" | "saml"
}

interface SsoSettingsFormProps {
  organizationId: string
  ssoDefaultRole: string
  ssoEnforced: boolean
  providers: SsoProviderSummary[]
}

export function SsoSettingsForm({ organizationId, ssoDefaultRole, ssoEnforced, providers }: SsoSettingsFormProps) {
  return (
    <div className="flex flex-col gap-6">
      <ProvidersList organizationId={organizationId} providers={providers} />
      <RegisterProviderCard organizationId={organizationId} />
      <SettingsCard organizationId={organizationId} ssoDefaultRole={ssoDefaultRole} ssoEnforced={ssoEnforced} />
    </div>
  )
}

function ProvidersList({ organizationId, providers }: { organizationId: string; providers: SsoProviderSummary[] }) {
  const [deleteState, deleteAction, isDeleting] = useActionState(deleteSsoProviderAction, initialState)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fournisseurs configurés</CardTitle>
        <CardDescription>Un employé dont l&apos;e-mail correspond à un domaine ci-dessous se connecte via ce fournisseur.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {deleteState.formError && (
          <p role="alert" className="text-sm text-destructive">
            {deleteState.formError}
          </p>
        )}
        {providers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun fournisseur SSO configuré pour le moment.</p>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Identifiant</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Domaine</TableHead>
                  <TableHead>Émetteur</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.map((provider) => (
                  <TableRow key={provider.providerId}>
                    <TableCell className="font-mono text-xs">{provider.providerId}</TableCell>
                    <TableCell>{provider.type === "oidc" ? "OIDC" : "SAML"}</TableCell>
                    <TableCell>{provider.domain}</TableCell>
                    <TableCell className="max-w-48 truncate text-muted-foreground">{provider.issuer}</TableCell>
                    <TableCell className="text-right">
                      <form action={deleteAction} className="inline">
                        <input type="hidden" name="organizationId" value={organizationId} />
                        <input type="hidden" name="providerId" value={provider.providerId} />
                        <Button type="submit" variant="ghost" size="sm" disabled={isDeleting}>
                          Supprimer
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function RegisterProviderCard({ organizationId }: { organizationId: string }) {
  const [type, setType] = useState<"oidc" | "saml">("oidc")
  const [manualEndpoints, setManualEndpoints] = useState(false)
  const [oidcState, oidcAction, isOidcPending] = useActionState(registerOidcProviderAction, initialState)
  const [samlState, samlAction, isSamlPending] = useActionState(registerSamlProviderAction, initialState)
  const state = type === "oidc" ? oidcState : samlState

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ajouter un fournisseur</CardTitle>
        <CardDescription>Métadonnées SAML ou client OIDC de votre fournisseur d&apos;identité.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex gap-2">
          <Button type="button" variant={type === "oidc" ? "default" : "outline"} size="sm" onClick={() => setType("oidc")}>
            OIDC
          </Button>
          <Button type="button" variant={type === "saml" ? "default" : "outline"} size="sm" onClick={() => setType("saml")}>
            SAML
          </Button>
        </div>

        {type === "oidc" ? (
          <form action={oidcAction} className="flex flex-col gap-4">
            <input type="hidden" name="organizationId" value={organizationId} />
            <CommonFields fieldErrors={oidcState.fieldErrors} />
            <div className="flex flex-col gap-2">
              <Label htmlFor="clientId">Client ID</Label>
              <Input id="clientId" name="clientId" aria-invalid={!!oidcState.fieldErrors?.clientId} />
              {oidcState.fieldErrors?.clientId && <p className="text-sm text-destructive">{oidcState.fieldErrors.clientId}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="clientSecret">Client Secret</Label>
              <Input id="clientSecret" name="clientSecret" type="password" aria-invalid={!!oidcState.fieldErrors?.clientSecret} />
              {oidcState.fieldErrors?.clientSecret && (
                <p className="text-sm text-destructive">{oidcState.fieldErrors.clientSecret}</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              URI de redirection à déclarer côté fournisseur : <code>/api/auth/sso/callback/&lt;identifiant&gt;</code>
            </p>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={manualEndpoints}
                onChange={(e) => setManualEndpoints(e.target.checked)}
              />
              Saisir les URLs manuellement (recommandé)
            </label>
            <input type="hidden" name="skipDiscovery" value={manualEndpoints ? "true" : "false"} />
            <p className="text-xs text-muted-foreground">
              La découverte automatique (à partir de l&apos;émetteur seul) échoue pour la
              plupart des fournisseurs tant que leurs URLs ne sont pas explicitement
              approuvées côté plateforme — préférez la saisie manuelle.
            </p>

            {manualEndpoints && (
              <>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="authorizationEndpoint">URL d&apos;autorisation</Label>
                  <Input
                    id="authorizationEndpoint"
                    name="authorizationEndpoint"
                    aria-invalid={!!oidcState.fieldErrors?.authorizationEndpoint}
                  />
                  {oidcState.fieldErrors?.authorizationEndpoint && (
                    <p className="text-sm text-destructive">{oidcState.fieldErrors.authorizationEndpoint}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="tokenEndpoint">URL de jeton (token)</Label>
                  <Input id="tokenEndpoint" name="tokenEndpoint" aria-invalid={!!oidcState.fieldErrors?.tokenEndpoint} />
                  {oidcState.fieldErrors?.tokenEndpoint && (
                    <p className="text-sm text-destructive">{oidcState.fieldErrors.tokenEndpoint}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="jwksEndpoint">URL JWKS</Label>
                  <Input id="jwksEndpoint" name="jwksEndpoint" aria-invalid={!!oidcState.fieldErrors?.jwksEndpoint} />
                  {oidcState.fieldErrors?.jwksEndpoint && (
                    <p className="text-sm text-destructive">{oidcState.fieldErrors.jwksEndpoint}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="userInfoEndpoint">URL userinfo (optionnel)</Label>
                  <Input id="userInfoEndpoint" name="userInfoEndpoint" />
                </div>
              </>
            )}

            <SubmitRow state={state} isPending={isOidcPending} />
          </form>
        ) : (
          <form action={samlAction} className="flex flex-col gap-4">
            <input type="hidden" name="organizationId" value={organizationId} />
            <CommonFields fieldErrors={samlState.fieldErrors} />
            <div className="flex flex-col gap-2">
              <Label htmlFor="entryPoint">Point d&apos;entrée (SSO URL)</Label>
              <Input id="entryPoint" name="entryPoint" placeholder="https://idp.example.com/sso" aria-invalid={!!samlState.fieldErrors?.entryPoint} />
              {samlState.fieldErrors?.entryPoint && <p className="text-sm text-destructive">{samlState.fieldErrors.entryPoint}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="cert">Certificat X.509</Label>
              <textarea
                id="cert"
                name="cert"
                rows={4}
                placeholder="-----BEGIN CERTIFICATE-----"
                className="rounded-md border border-input bg-transparent px-3 py-2 font-mono text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                aria-invalid={!!samlState.fieldErrors?.cert}
              />
              {samlState.fieldErrors?.cert && <p className="text-sm text-destructive">{samlState.fieldErrors.cert}</p>}
            </div>
            <p className="text-xs text-muted-foreground">
              URL du service ACS à déclarer côté fournisseur : <code>/api/auth/sso/saml2/sp/acs/&lt;identifiant&gt;</code>
            </p>
            <SubmitRow state={state} isPending={isSamlPending} />
          </form>
        )}
      </CardContent>
    </Card>
  )
}

function CommonFields({ fieldErrors }: { fieldErrors?: Record<string, string> }) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor="providerId">Identifiant du fournisseur</Label>
        <Input id="providerId" name="providerId" placeholder="okta-acme" aria-invalid={!!fieldErrors?.providerId} />
        <p className="text-xs text-muted-foreground">Minuscules, chiffres et tirets — unique dans toute l&apos;application.</p>
        {fieldErrors?.providerId && <p className="text-sm text-destructive">{fieldErrors.providerId}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="issuer">Émetteur (issuer)</Label>
        <Input id="issuer" name="issuer" aria-invalid={!!fieldErrors?.issuer} />
        {fieldErrors?.issuer && <p className="text-sm text-destructive">{fieldErrors.issuer}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="domain">Domaine e-mail des employés</Label>
        <Input id="domain" name="domain" placeholder="acme.com" aria-invalid={!!fieldErrors?.domain} />
        {fieldErrors?.domain && <p className="text-sm text-destructive">{fieldErrors.domain}</p>}
      </div>
    </>
  )
}

function SubmitRow({ state, isPending }: { state: SsoActionState; isPending: boolean }) {
  return (
    <>
      {state.formError && (
        <p role="alert" className="text-sm text-destructive">
          {state.formError}
        </p>
      )}
      {state.success && <p className="text-sm text-muted-foreground">Fournisseur enregistré.</p>}
      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Enregistrement..." : "Ajouter le fournisseur"}
      </Button>
    </>
  )
}

function SettingsCard({
  organizationId,
  ssoDefaultRole,
  ssoEnforced,
}: {
  organizationId: string
  ssoDefaultRole: string
  ssoEnforced: boolean
}) {
  const [state, formAction, isPending] = useActionState(updateSsoSettingsAction, initialState)
  const [enforced, setEnforced] = useState(ssoEnforced)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Réglages</CardTitle>
        <CardDescription>Rôle attribué aux nouveaux employés provisionnés via SSO, et connexion par mot de passe.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="organizationId" value={organizationId} />
          <input type="hidden" name="ssoEnforced" value={enforced ? "true" : "false"} />

          <div className="flex flex-col gap-2">
            <Label htmlFor="ssoDefaultRole">Rôle par défaut à la connexion SSO</Label>
            <Select name="ssoDefaultRole" defaultValue={ssoDefaultRole}>
              <SelectTrigger id="ssoDefaultRole" className="w-full max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Membre</SelectItem>
                <SelectItem value="admin">Administrateur</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <Switch id="ssoEnforced" checked={enforced} onCheckedChange={setEnforced} />
            <div>
              <Label htmlFor="ssoEnforced">Désactiver la connexion par mot de passe</Label>
              <p className="text-xs text-muted-foreground">
                Les membres devront obligatoirement se connecter via SSO. Nécessite au moins un fournisseur configuré.
              </p>
            </div>
          </div>

          {state.formError && (
            <p role="alert" className="text-sm text-destructive">
              {state.formError}
            </p>
          )}
          {state.success && <p className="text-sm text-muted-foreground">Réglages mis à jour.</p>}

          <Button type="submit" disabled={isPending} className="w-fit">
            {isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
