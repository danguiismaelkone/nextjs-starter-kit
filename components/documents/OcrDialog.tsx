"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export interface OcrableDocument {
  id: string
  name: string
}

interface OcrDialogProps {
  /** Document à traiter, ou `null` pour fermer la modale. */
  document: OcrableDocument | null
  onOpenChange: (open: boolean) => void
}

/**
 * Extraction de texte OCR (ITEM-042) : lance le traitement dès l'ouverture,
 * affiche le texte extrait ou un message explicite (format non supporté,
 * fichier trop volumineux, IA indisponible) — jamais une erreur technique brute.
 */
export function OcrDialog({ document, onOpenChange }: OcrDialogProps) {
  const [text, setText] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Identifie la requête la plus récente : une réponse d'une requête
  // remplacée entre-temps (changement de document, relance) est ignorée.
  const requestIdRef = useRef(0)

  function runExtraction(documentId: string) {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    setLoading(true)
    setError(null)
    setText(null)

    fetch("/api/ai/ocr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId }),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}))
        if (requestIdRef.current !== requestId) return
        if (!response.ok) {
          setError(data.error ?? "Échec de l'extraction de texte.")
          return
        }
        setText(typeof data.text === "string" ? data.text : "")
      })
      .catch(() => {
        if (requestIdRef.current === requestId) setError("Échec de l'extraction de texte.")
      })
      .finally(() => {
        if (requestIdRef.current === requestId) setLoading(false)
      })
  }

  useEffect(() => {
    if (!document) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset au changement de `document` (identité de la modale), même pattern que ShareDialog/VersionHistory
      setText(null)
      return
    }
    runExtraction(document.id)
  }, [document])

  return (
    <Dialog open={document !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="truncate">Texte extrait — {document?.name}</DialogTitle>
          <DialogDescription>Extraction automatique du texte via l&apos;IA (OCR).</DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && error && (
          <>
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => document && runExtraction(document.id)}
            >
              Réessayer
            </Button>
          </>
        )}

        {!loading && !error && text !== null && (
          <>
            <div className="max-h-96 overflow-y-auto rounded-md border bg-muted/40 p-3 text-sm whitespace-pre-wrap">
              {text || <span className="text-muted-foreground">Aucun texte détecté.</span>}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => document && runExtraction(document.id)}
            >
              Relancer l&apos;extraction
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
