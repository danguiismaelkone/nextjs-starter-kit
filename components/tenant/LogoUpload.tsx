"use client"

import { useRef, useState, type ChangeEvent } from "react"
import { useRouter } from "next/navigation"
import { Image as ImageIcon, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

const ACCEPTED_LOGO_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_LOGO_SIZE = 5 * 1024 * 1024 // synchronisé avec app/api/organizations/[id]/logo/route.ts

interface LogoUploadProps {
  organizationId: string
  logo: string | null
}

/**
 * Upload direct du logo d'organisation (ITEM-075, remplace l'ancien champ URL
 * texte) — même schéma que `AvatarSection` (ITEM-045) mais sans étape de
 * recadrage : un logo n'est pas nécessairement carré. Chaque sélection de
 * fichier envoie immédiatement vers `POST /api/organizations/[id]/logo`, pas
 * de bouton « Enregistrer » séparé (cohérent avec l'avatar).
 */
export function LogoUpload({ organizationId, logo }: LogoUploadProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    setError(null)
    if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
      setError("Format non accepté (JPEG, PNG ou WebP).")
      return
    }
    if (file.size > MAX_LOGO_SIZE) {
      setError(`Fichier trop volumineux (max ${MAX_LOGO_SIZE / (1024 * 1024)} Mo).`)
      return
    }

    setIsPending(true)
    const formData = new FormData()
    formData.append("file", file)
    const response = await fetch(`/api/organizations/${organizationId}/logo`, { method: "POST", body: formData })
    setIsPending(false)

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      setError(data.error ?? "Échec de l'envoi du logo.")
      return
    }
    router.refresh()
  }

  async function handleRemove() {
    setIsPending(true)
    setError(null)
    const response = await fetch(`/api/organizations/${organizationId}/logo`, { method: "DELETE" })
    setIsPending(false)

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      setError(data.error ?? "Échec de la suppression du logo.")
      return
    }
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire (route interne), pas une ressource optimisable par next/image
          <img src={logo} alt="Logo de l'organisation" className="h-12 w-12 rounded-md border object-contain" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-md border bg-muted text-muted-foreground">
            <ImageIcon className="h-5 w-5" />
          </div>
        )}
        <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {logo ? "Changer le logo" : "Choisir un logo"}
        </Button>
        {logo && (
          <Button type="button" variant="ghost" size="sm" onClick={handleRemove} disabled={isPending}>
            Retirer
          </Button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_LOGO_TYPES.join(",")}
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
