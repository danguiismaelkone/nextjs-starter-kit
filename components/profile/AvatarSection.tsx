"use client"

import { useRef, useState, type ChangeEvent } from "react"
import { useRouter } from "next/navigation"
import Cropper, { type Area } from "react-easy-crop"
import { Loader2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface AvatarSectionProps {
  name: string
  image: string | null
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_SIZE = 5 * 1024 * 1024 // synchronisé avec app/api/profile/avatar/route.ts

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener("load", () => resolve(image))
    image.addEventListener("error", () => reject(new Error("Impossible de charger l'image.")))
    image.src = src
  })
}

/** Recadre l'image source à la zone sélectionnée et l'encode en JPEG. */
async function getCroppedBlob(imageSrc: string, area: Area): Promise<Blob> {
  const image = await loadImage(imageSrc)
  const canvas = document.createElement("canvas")
  canvas.width = area.width
  canvas.height = area.height
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Le recadrage n'est pas supporté par ce navigateur.")

  ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Échec du recadrage."))), "image/jpeg", 0.92)
  })
}

/** Avatar + upload avec recadrage (ITEM-045). */
export function AvatarSection({ name, image }: AvatarSectionProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    setError(null)
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Format non accepté (JPEG, PNG ou WebP).")
      return
    }
    if (file.size > MAX_SIZE) {
      setError(`Fichier trop volumineux (max ${MAX_SIZE / (1024 * 1024)} Mo).`)
      return
    }

    setImageSrc(URL.createObjectURL(file))
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedAreaPixels(null)
  }

  async function handleSave() {
    if (!imageSrc || !croppedAreaPixels) return
    setSaving(true)
    setError(null)

    try {
      const blob = await getCroppedBlob(imageSrc, croppedAreaPixels)
      const formData = new FormData()
      formData.append("file", blob, "avatar.jpg")

      const response = await fetch("/api/profile/avatar", { method: "POST", body: formData })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? "Échec de l'envoi de l'avatar.")
        return
      }

      setImageSrc(null)
      router.refresh()
    } catch {
      setError("Échec de l'envoi de l'avatar.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar className="h-16 w-16">
        {image ? <AvatarImage src={image} alt={name} /> : null}
        <AvatarFallback className="text-lg">{getInitials(name) || "U"}</AvatarFallback>
      </Avatar>

      <div>
        <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
          Changer l&apos;avatar
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          className="hidden"
          onChange={handleFileChange}
        />
        {error && !imageSrc && (
          <p role="alert" className="mt-1 text-sm text-destructive">
            {error}
          </p>
        )}
      </div>

      <Dialog open={imageSrc !== null} onOpenChange={(open) => !open && setImageSrc(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recadrer l&apos;avatar</DialogTitle>
            <DialogDescription>Ajustez le cadrage et le zoom, puis enregistrez.</DialogDescription>
          </DialogHeader>

          {imageSrc && (
            <div className="relative h-72 w-full overflow-hidden rounded-md bg-muted">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_area, areaPixels) => setCroppedAreaPixels(areaPixels)}
              />
            </div>
          )}

          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="w-full accent-primary"
            aria-label="Zoom"
          />

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setImageSrc(null)} disabled={saving}>
              Annuler
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving || !croppedAreaPixels}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
