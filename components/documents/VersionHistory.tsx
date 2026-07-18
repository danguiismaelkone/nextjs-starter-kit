"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export interface VersionHistoryDocument {
  id: string
  name: string
}

interface VersionEntry {
  id: string
  versionNumber: number
  size: number
  mimeType: string
  createdAt: string
  createdByName: string | null
  isCurrent: boolean
}

interface VersionHistoryProps {
  /** Document dont on consulte l'historique, ou `null` pour fermer le panneau. */
  document: VersionHistoryDocument | null
  onOpenChange: (open: boolean) => void
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  const units = ["Ko", "Mo", "Go"]
  let value = bytes / 1024
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`
}

/** Panneau d'historique des versions (ITEM-031) : liste + restauration d'une version antérieure. */
export function VersionHistory({ document, onOpenChange }: VersionHistoryProps) {
  const router = useRouter()
  const [versions, setVersions] = useState<VersionEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [restoringId, setRestoringId] = useState<string | null>(null)

  useEffect(() => {
    if (!document) {
      setVersions([])
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(`/api/documents/${document.id}/versions`)
      .then(async (response) => {
        const data = await response.json().catch(() => ({}))
        if (cancelled) return
        if (!response.ok) {
          setError(data.error ?? "Impossible de charger l'historique.")
          return
        }
        setVersions(data.versions ?? [])
      })
      .catch(() => {
        if (!cancelled) setError("Impossible de charger l'historique.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [document])

  async function handleRestore(versionId: string) {
    if (!document) return
    setRestoringId(versionId)
    setError(null)
    try {
      const response = await fetch(`/api/documents/${document.id}/versions/${versionId}/restore`, {
        method: "POST",
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? "Échec de la restauration.")
        return
      }
      setVersions((current) => current.map((version) => ({ ...version, isCurrent: version.id === versionId })))
      router.refresh()
    } finally {
      setRestoringId(null)
    }
  }

  return (
    <Dialog open={document !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="truncate">Historique — {document?.name}</DialogTitle>
          <DialogDescription>Versions précédentes, de la plus récente à la plus ancienne.</DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        {!loading && !error && (
          <ul className="max-h-80 space-y-2 overflow-y-auto">
            {versions.map((version) => (
              <li key={version.id} className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Version {version.versionNumber}</span>
                    {version.isCurrent && <Badge variant="secondary">Actuelle</Badge>}
                  </div>
                  <p className="text-muted-foreground">
                    {new Date(version.createdAt).toLocaleString("fr-FR")} · {formatSize(version.size)}
                    {version.createdByName ? ` · ${version.createdByName}` : ""}
                  </p>
                </div>
                {!version.isCurrent && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={restoringId === version.id}
                    onClick={() => handleRestore(version.id)}
                  >
                    <RotateCcw className="h-4 w-4" />
                    {restoringId === version.id ? "..." : "Restaurer"}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
