"use client"

import { useEffect, useState } from "react"
import { Copy, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export interface ShareableDocument {
  id: string
  name: string
}

interface ShareEntry {
  id: string
  token: string
  accessLevel: "view" | "comment"
  visibility: "public" | "restricted"
  expiresAt: string | null
  revokedAt: string | null
  createdAt: string
  isActive: boolean
}

interface ShareDialogProps {
  /** Document à partager, ou `null` pour fermer la modale. */
  document: ShareableDocument | null
  onOpenChange: (open: boolean) => void
}

const EXPIRATION_OPTIONS = [
  { value: "never", label: "Jamais", days: null },
  { value: "1", label: "1 jour", days: 1 },
  { value: "7", label: "7 jours", days: 7 },
  { value: "30", label: "30 jours", days: 30 },
] as const

function shareUrl(token: string): string {
  if (typeof window === "undefined") return `/share/${token}`
  return `${window.location.origin}/share/${token}`
}

/** Panneau de partage (ITEM-033) : génération de lien, liste des liens existants, révocation. */
export function ShareDialog({ document, onOpenChange }: ShareDialogProps) {
  const [shares, setShares] = useState<ShareEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [accessLevel, setAccessLevel] = useState<"view" | "comment">("view")
  const [visibility, setVisibility] = useState<"public" | "restricted">("restricted")
  const [expiration, setExpiration] = useState<(typeof EXPIRATION_OPTIONS)[number]["value"]>("never")

  useEffect(() => {
    if (!document) {
      setShares([])
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(`/api/documents/${document.id}/shares`)
      .then(async (response) => {
        const data = await response.json().catch(() => ({}))
        if (cancelled) return
        if (!response.ok) {
          setError(data.error ?? "Impossible de charger les liens de partage.")
          return
        }
        setShares(data.shares ?? [])
      })
      .catch(() => {
        if (!cancelled) setError("Impossible de charger les liens de partage.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [document])

  async function handleCreate() {
    if (!document) return
    setCreating(true)
    setError(null)
    const days = EXPIRATION_OPTIONS.find((option) => option.value === expiration)?.days ?? null
    try {
      const response = await fetch(`/api/documents/${document.id}/shares`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessLevel, visibility, expiresInDays: days }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? "Échec de la génération du lien.")
        return
      }
      setShares((current) => [data.share, ...current])
    } finally {
      setCreating(false)
    }
  }

  async function handleRevoke(shareId: string) {
    if (!document) return
    setRevokingId(shareId)
    setError(null)
    try {
      const response = await fetch(`/api/documents/${document.id}/shares/${shareId}`, { method: "DELETE" })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? "Échec de la révocation.")
        return
      }
      setShares((current) =>
        current.map((share) => (share.id === shareId ? { ...share, revokedAt: new Date().toISOString(), isActive: false } : share))
      )
    } finally {
      setRevokingId(null)
    }
  }

  async function handleCopy(share: ShareEntry) {
    await navigator.clipboard.writeText(shareUrl(share.token))
    setCopiedId(share.id)
    setTimeout(() => setCopiedId((current) => (current === share.id ? null : current)), 2000)
  }

  return (
    <Dialog open={document !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="truncate">Partager — {document?.name}</DialogTitle>
          <DialogDescription>
            Génère un lien externe donnant accès à ce document sans passer par l&apos;organisation.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2">
          <Select value={accessLevel} onValueChange={(value) => setAccessLevel(value as "view" | "comment")}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="view">Lecture seule</SelectItem>
              <SelectItem value="comment">Commentaire</SelectItem>
            </SelectContent>
          </Select>

          <Select value={visibility} onValueChange={(value) => setVisibility(value as "public" | "restricted")}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="restricted">Restreint (membres)</SelectItem>
              <SelectItem value="public">Public (sans compte)</SelectItem>
            </SelectContent>
          </Select>

          <Select value={expiration} onValueChange={(value) => setExpiration(value as typeof expiration)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXPIRATION_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleCreate} disabled={creating}>
          {creating ? "Génération..." : "Générer un lien"}
        </Button>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        {loading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && shares.length > 0 && (
          <ul className="max-h-64 space-y-2 overflow-y-auto">
            {shares.map((share) => (
              <li key={share.id} className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={share.visibility === "public" ? "default" : "secondary"}>
                      {share.visibility === "public" ? "Public" : "Restreint"}
                    </Badge>
                    <Badge variant="outline">{share.accessLevel === "comment" ? "Commentaire" : "Lecture seule"}</Badge>
                    {!share.isActive && (
                      <Badge variant="destructive">{share.revokedAt ? "Révoqué" : "Expiré"}</Badge>
                    )}
                  </div>
                  <p className="mt-1 truncate text-muted-foreground">
                    {share.expiresAt
                      ? `Expire le ${new Date(share.expiresAt).toLocaleString("fr-FR")}`
                      : "Jamais d'expiration"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {share.isActive && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => handleCopy(share)}>
                        <Copy className="h-4 w-4" />
                        {copiedId === share.id ? "Copié" : "Copier"}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={revokingId === share.id}
                        onClick={() => handleRevoke(share.id)}
                      >
                        {revokingId === share.id ? "..." : "Révoquer"}
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {!loading && shares.length === 0 && !error && (
          <p className="text-sm text-muted-foreground">Aucun lien de partage pour ce document.</p>
        )}
      </DialogContent>
    </Dialog>
  )
}
