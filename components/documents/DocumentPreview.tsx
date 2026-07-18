"use client"

import { useEffect, useState } from "react"
import { Download, FileText, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const PREVIEWABLE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]
const PREVIEWABLE_PDF_TYPE = "application/pdf"

export interface PreviewableDocument {
  id: string
  name: string
  mimeType: string
  size: number
}

interface DocumentPreviewProps {
  /** Document à prévisualiser, ou `null` pour fermer la modale. */
  document: PreviewableDocument | null
  onOpenChange: (open: boolean) => void
}

function isPreviewable(mimeType: string): boolean {
  return PREVIEWABLE_IMAGE_TYPES.includes(mimeType) || mimeType === PREVIEWABLE_PDF_TYPE
}

/**
 * Prévisualisation image/PDF dans une modale (URL signée chargée à
 * l'ouverture), avec repli « icône + téléchargement » pour les types non
 * prévisualisables.
 */
export function DocumentPreview({ document, onOpenChange }: DocumentPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (!document || !isPreviewable(document.mimeType)) {
      setPreviewUrl(null)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(`/api/documents/${document.id}`)
      .then(async (response) => {
        const data = await response.json().catch(() => ({}))
        if (cancelled) return
        if (!response.ok || !data.url) {
          setError(data.error ?? "Impossible de charger la prévisualisation.")
          return
        }
        setPreviewUrl(data.url)
      })
      .catch(() => {
        if (!cancelled) setError("Impossible de charger la prévisualisation.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [document])

  async function handleDownload() {
    if (!document) return
    setDownloading(true)
    setError(null)
    try {
      const response = await fetch(`/api/documents/${document.id}?download=1`)
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.url) {
        setError(data.error ?? "Impossible de générer le lien de téléchargement.")
        return
      }
      window.open(data.url, "_blank", "noopener")
    } finally {
      setDownloading(false)
    }
  }

  const previewable = document ? isPreviewable(document.mimeType) : false

  return (
    <Dialog open={document !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="truncate">{document?.name}</DialogTitle>
        </DialogHeader>

        <div className="flex min-h-48 items-center justify-center">
          {previewable && loading && <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />}

          {previewable && !loading && error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          {previewable && !loading && !error && previewUrl && document?.mimeType === PREVIEWABLE_PDF_TYPE && (
            <iframe src={previewUrl} title={document.name} className="h-[70vh] w-full rounded-md border" />
          )}

          {previewable && !loading && !error && previewUrl && document && PREVIEWABLE_IMAGE_TYPES.includes(document.mimeType) && (
            // eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire (S3), pas une ressource optimisable par next/image
            <img src={previewUrl} alt={document.name} className="mx-auto max-h-[70vh] w-auto rounded-md object-contain" />
          )}

          {!previewable && (
            <div className="flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
              <FileText className="h-12 w-12" />
              <p>Aperçu non disponible pour ce type de fichier.</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleDownload} disabled={downloading}>
            <Download className="h-4 w-4" />
            {downloading ? "..." : "Télécharger"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
