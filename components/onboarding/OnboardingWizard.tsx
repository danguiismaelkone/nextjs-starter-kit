"use client"

import { useRef, useState, useTransition, type ChangeEvent, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Image as ImageIcon, Loader2 } from "lucide-react"
import { createOnboardingOrganizationAction } from "@/app/onboarding/actions"
import { createInvitationAction } from "@/app/(protected)/admin/invitations/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PlanGrid, type PlanData } from "@/components/billing/PlanGrid"

const MAX_INVITE_ROWS = 5
const ACCEPTED_LOGO_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_LOGO_SIZE = 5 * 1024 * 1024 // synchronisé avec app/api/organizations/[id]/logo/route.ts

type OnboardingStep = "organisation" | "invitations" | "plan"

interface OnboardingWizardProps {
  /** Plans actifs réels (`Plan`, `isActive: true`) — étape « Plan » (ITEM-074). */
  plans: PlanData[]
  /**
   * `"plan"` quand la page atterrit ici après un paiement Stripe annulé
   * (`cancel_url`, ITEM-074 critère 4) — l'organisation et les invitations
   * sont déjà passées, inutile de rejouer les étapes 1/2.
   */
  initialStep?: OnboardingStep
}

/**
 * Assistant d'inscription en 3 étapes (ITEM-073/074) : organisation (nom,
 * logo), invitations, puis plan — état d'étape géré localement (composant
 * client unique), pas en query params : ni le back-office ni les liens
 * externes n'ont besoin de cibler une étape précise, et cela évite une
 * navigation complète entre appels serveur qui dépendent l'un de l'autre
 * (l'organisation doit exister avant que `createInvitationAction` puisse
 * s'exécuter).
 */
export function OnboardingWizard({ plans, initialStep = "organisation" }: OnboardingWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState<OnboardingStep>(initialStep)

  // Étape 1 (Organisation) : soumission manuelle (pas `useActionState`) — la
  // création de l'organisation et l'upload du logo (ITEM-075) sont deux
  // appels distincts qui doivent s'enchaîner (l'upload a besoin de l'id de
  // l'organisation, qui n'existe qu'après le premier appel).
  const [name, setName] = useState("")
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [orgFieldErrors, setOrgFieldErrors] = useState<Record<string, string>>({})
  const [orgError, setOrgError] = useState<string | null>(null)
  const [isOrgPending, startOrgTransition] = useTransition()
  const logoInputRef = useRef<HTMLInputElement>(null)

  function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    setOrgError(null)
    if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
      setOrgError("Format non accepté (JPEG, PNG ou WebP).")
      return
    }
    if (file.size > MAX_LOGO_SIZE) {
      setOrgError(`Fichier trop volumineux (max ${MAX_LOGO_SIZE / (1024 * 1024)} Mo).`)
      return
    }

    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  function handleOrganizationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setOrgError(null)
    setOrgFieldErrors({})

    startOrgTransition(async () => {
      const formData = new FormData()
      formData.set("name", name)
      const result = await createOnboardingOrganizationAction({}, formData)

      if (result.fieldErrors) {
        setOrgFieldErrors(result.fieldErrors)
        return
      }
      if (result.formError || !result.organizationId) {
        setOrgError(result.formError ?? "Une erreur est survenue, veuillez réessayer.")
        return
      }

      if (logoFile) {
        const logoFormData = new FormData()
        logoFormData.append("file", logoFile)
        const response = await fetch(`/api/organizations/${result.organizationId}/logo`, {
          method: "POST",
          body: logoFormData,
        })
        if (!response.ok) {
          // Le logo est optionnel : un échec d'upload ne bloque pas la
          // progression — l'admin pourra réessayer depuis les réglages.
          const data = await response.json().catch(() => ({}))
          setOrgError(data.error ?? "Organisation créée, mais l'envoi du logo a échoué (réessayez depuis les réglages).")
        }
      }

      setStep("invitations")
    })
  }

  const [emails, setEmails] = useState<string[]>([""])
  const [inviteErrors, setInviteErrors] = useState<string[]>([])
  const [isInvitePending, startInviteTransition] = useTransition()

  function updateEmail(index: number, value: string) {
    setEmails((prev) => prev.map((email, i) => (i === index ? value : email)))
  }

  function addEmailRow() {
    setEmails((prev) => (prev.length < MAX_INVITE_ROWS ? [...prev, ""] : prev))
  }

  function removeEmailRow(index: number) {
    setEmails((prev) => prev.filter((_, i) => i !== index))
  }

  function goToDashboard() {
    // `/dashboard` n'a jamais été visité dans cette session : `push()` seul
    // suffit, un `refresh()` immédiatement après course la navigation en
    // cours (même raison que l'ancien flux d'inscription, ITEM-014).
    router.push("/dashboard")
  }

  // Après l'étape invitations (ITEM-074) : passe à l'étape « Plan » — sauf
  // si aucun plan actif n'existe, auquel cas il n'y a rien à y afficher.
  function proceedAfterInvitations() {
    if (plans.length === 0) {
      goToDashboard()
      return
    }
    setStep("plan")
  }

  function handleSendInvitations() {
    const nonEmpty = emails.map((email) => email.trim()).filter(Boolean)
    if (nonEmpty.length === 0) {
      proceedAfterInvitations()
      return
    }

    setInviteErrors([])
    startInviteTransition(async () => {
      const errors: string[] = []
      for (const email of nonEmpty) {
        const formData = new FormData()
        formData.set("email", email)
        const result = await createInvitationAction({}, formData)
        const error = result.formError ?? result.fieldErrors?.email
        if (error) errors.push(`${email} : ${error}`)
      }

      if (errors.length > 0) {
        setInviteErrors(errors)
        return
      }
      proceedAfterInvitations()
    })
  }

  if (step === "plan") {
    return (
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>Choisissez votre plan</CardTitle>
          <CardDescription>
            Étape 3 sur 3 — souscrivez maintenant ou continuez avec l&apos;essai gratuit de 14 jours déjà en cours.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <PlanGrid plans={plans} returnTo="/onboarding" />
          <Button type="button" variant="outline" className="w-fit self-center" onClick={goToDashboard}>
            Continuer avec l&apos;essai gratuit (14 jours)
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      {step === "organisation" ? (
        <>
          <CardHeader>
            <CardTitle>Configurez votre organisation</CardTitle>
            <CardDescription>Étape 1 sur 3</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleOrganizationSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Nom de l&apos;organisation</Label>
                <Input
                  id="name"
                  name="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  aria-invalid={!!orgFieldErrors.name}
                />
                {orgFieldErrors.name && <p className="text-sm text-destructive">{orgFieldErrors.name}</p>}
              </div>

              <div className="flex flex-col gap-2">
                <Label>Logo (optionnel)</Label>
                <div className="flex items-center gap-3">
                  {logoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element -- preview local (blob:), pas une ressource optimisable par next/image
                    <img src={logoPreview} alt="Aperçu du logo" className="h-12 w-12 rounded-md border object-contain" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-md border bg-muted text-muted-foreground">
                      <ImageIcon className="h-5 w-5" />
                    </div>
                  )}
                  <Button type="button" variant="outline" size="sm" onClick={() => logoInputRef.current?.click()}>
                    {logoFile ? "Changer le logo" : "Choisir un logo"}
                  </Button>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept={ACCEPTED_LOGO_TYPES.join(",")}
                    className="hidden"
                    onChange={handleLogoChange}
                  />
                </div>
              </div>

              {orgError && (
                <p role="alert" className="text-sm text-destructive">
                  {orgError}
                </p>
              )}

              <Button type="submit" disabled={isOrgPending} className="w-full">
                {isOrgPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isOrgPending ? "Création..." : "Continuer"}
              </Button>
            </form>
          </CardContent>
        </>
      ) : (
        <>
          <CardHeader>
            <CardTitle>Invitez votre équipe</CardTitle>
            <CardDescription>Étape 2 sur 3 — facultatif</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              {emails.map((email, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    type="email"
                    placeholder="coequipier@exemple.com"
                    value={email}
                    onChange={(event) => updateEmail(index, event.target.value)}
                  />
                  {emails.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeEmailRow(index)}>
                      Retirer
                    </Button>
                  )}
                </div>
              ))}
              {emails.length < MAX_INVITE_ROWS && (
                <Button type="button" variant="outline" size="sm" className="w-fit" onClick={addEmailRow}>
                  Ajouter un e-mail
                </Button>
              )}
            </div>

            {inviteErrors.length > 0 && (
              <ul className="flex flex-col gap-1 text-sm text-destructive">
                {inviteErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            )}

            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={proceedAfterInvitations} disabled={isInvitePending}>
                Passer cette étape
              </Button>
              <Button type="button" className="flex-1" onClick={handleSendInvitations} disabled={isInvitePending}>
                {isInvitePending ? "Envoi..." : "Envoyer et continuer"}
              </Button>
            </div>
          </CardContent>
        </>
      )}
    </Card>
  )
}
