"use client"

import { useState, useTransition } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface FolderRef {
  id: string
  name: string
}

interface FolderDialogProps {
  mode: "create" | "rename"
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  /** Dossier parent de création (`null` = racine) — mode "create" uniquement. */
  parentId?: string | null
  /** Dossier à renommer — mode "rename" uniquement. */
  folder?: FolderRef | null
}

export function FolderDialog({ mode, open, onOpenChange, onSuccess, parentId = null, folder = null }: FolderDialogProps) {
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  // Réinitialise le formulaire à chaque (ré)ouverture — ajustement d'état
  // pendant le rendu plutôt qu'un effet, cf. règle `react-hooks/set-state-in-effect`.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setName(mode === "rename" ? (folder?.name ?? "") : "")
      setError(null)
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError("Le nom est requis.")
      return
    }

    startTransition(async () => {
      const url = mode === "create" ? "/api/folders" : `/api/folders/${folder?.id}`
      const method = mode === "create" ? "POST" : "PATCH"
      const body = mode === "create" ? { name: trimmed, parentId } : { name: trimmed }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? "Une erreur est survenue.")
        return
      }
      onOpenChange(false)
      onSuccess()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{mode === "create" ? "Nouveau dossier" : "Renommer le dossier"}</DialogTitle>
            <DialogDescription>
              {mode === "create"
                ? "Créer un dossier dans l'emplacement courant."
                : "Choisissez un nouveau nom pour ce dossier."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="folder-name">Nom</Label>
            <Input
              id="folder-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={100}
              autoFocus
            />
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "..." : mode === "create" ? "Créer" : "Renommer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
