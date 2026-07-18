"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export interface SummarizableDocument {
  id: string
  name: string
}

interface SummaryDialogProps {
  /** Document à résumer, ou `null` pour fermer la modale. */
  document: SummarizableDocument | null
  onOpenChange: (open: boolean) => void
}

/**
 * Panneau de résumé (ITEM-043) : au premier appel, charge le résumé déjà en
 * cache pour ce document ; ne régénère que si aucun résumé n'existe encore,
 * ou explicitement via le bouton « Régénérer ».
 */
export function SummaryDialog({ document, onOpenChange }: SummaryDialogProps) {
  const [summary, setSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Identifie la requête la plus récente : une réponse d'une requête
  // remplacée entre-temps (changement de document, régénération) est ignorée.
  const requestIdRef = useRef(0)

  function generate(documentId: string) {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    setGenerating(true)
    setError(null)

    fetch("/api/ai/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId }),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}))
        if (requestIdRef.current !== requestId) return
        if (!response.ok) {
          setError(data.error ?? "Échec de la génération du résumé.")
          return
        }
        setSummary(typeof data.summary === "string" ? data.summary : "")
      })
      .catch(() => {
        if (requestIdRef.current === requestId) setError("Échec de la génération du résumé.")
      })
      .finally(() => {
        if (requestIdRef.current === requestId) setGenerating(false)
      })
  }

  function loadCached(documentId: string) {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    setLoading(true)
    setError(null)
    setSummary(null)

    fetch(`/api/ai/summarize?documentId=${encodeURIComponent(documentId)}`)
      .then(async (response) => {
        const data = await response.json().catch(() => ({}))
        if (requestIdRef.current !== requestId) return
        if (!response.ok) {
          setError(data.error ?? "Impossible de charger le résumé.")
          return
        }
        if (typeof data.summary === "string" && data.summary.length > 0) {
          setSummary(data.summary)
        } else {
          // Pas encore de résumé en cache : première génération automatique.
          generate(documentId)
        }
      })
      .catch(() => {
        if (requestIdRef.current === requestId) setError("Impossible de charger le résumé.")
      })
      .finally(() => {
        if (requestIdRef.current === requestId) setLoading(false)
      })
  }

  useEffect(() => {
    if (!document) {
      setSummary(null)
      return
    }
    loadCached(document.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ne relancer que sur changement de document ; `loadCached` est redéfinie à chaque rendu mais son comportement ne dépend que de l'argument passé
  }, [document])

  const busy = loading || generating

  return (
    <Dialog open={document !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="truncate">Résumé — {document?.name}</DialogTitle>
          <DialogDescription>Résumé structuré généré par l&apos;IA, mis en cache pour ce document.</DialogDescription>
        </DialogHeader>

        {busy && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!busy && error && (
          <>
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => document && generate(document.id)}
            >
              Réessayer
            </Button>
          </>
        )}

        {!busy && !error && summary !== null && (
          <>
            <div className="max-h-96 overflow-y-auto rounded-md border bg-muted/40 p-3 text-sm whitespace-pre-wrap">
              {summary}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => document && generate(document.id)}
            >
              Régénérer
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
