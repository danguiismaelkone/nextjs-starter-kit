"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { File, Folder as FolderIcon, RotateCcw, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { PageHeader } from "@/components/layout/PageHeader"
import { DetailPageLayout } from "@/components/layout/DetailPageLayout"

export interface TrashFolderEntry {
  id: string
  name: string
  deletedAt: string
}

export interface TrashDocumentEntry {
  id: string
  name: string
  size: number
  mimeType: string
  deletedAt: string
  uploadedByName: string | null
}

interface TrashViewProps {
  retentionDays: number
  folders: TrashFolderEntry[]
  documents: TrashDocumentEntry[]
}

type TrashItem = { type: "folder" | "document"; id: string; name: string }

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

function apiBaseUrl(item: TrashItem): string {
  return item.type === "folder" ? `/api/folders/${item.id}` : `/api/documents/${item.id}`
}

/** Corbeille (ITEM-032) : restauration ou suppression définitive des dossiers/documents supprimés (`listTrash`, niveau le plus haut de chaque sous-arbre). */
export function TrashView({ retentionDays, folders, documents }: TrashViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [purgeTarget, setPurgeTarget] = useState<TrashItem | null>(null)

  function handleRestore(item: TrashItem) {
    setError(null)
    setRestoringId(item.id)
    startTransition(async () => {
      const response = await fetch(`${apiBaseUrl(item)}/restore`, { method: "POST" })
      const data = await response.json().catch(() => ({}))
      setRestoringId(null)
      if (!response.ok) {
        setError(data.error ?? "Échec de la restauration.")
        return
      }
      router.refresh()
    })
  }

  function handlePurge() {
    if (!purgeTarget) return
    setError(null)
    startTransition(async () => {
      const response = await fetch(`${apiBaseUrl(purgeTarget)}/purge`, { method: "DELETE" })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? "Échec de la suppression définitive.")
        return
      }
      setPurgeTarget(null)
      router.refresh()
    })
  }

  const isEmpty = folders.length === 0 && documents.length === 0

  return (
    <DetailPageLayout
      breadcrumbs={[{ label: "Documents", href: "/documents" }]}
      header={
        <PageHeader
          title="Corbeille"
          description={`Les éléments supprimés sont conservés ${retentionDays} jours avant purge définitive.`}
        />
      }
    >
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {isEmpty && <p className="text-muted-foreground">La corbeille est vide.</p>}

      {!isEmpty && (
        <ul className="space-y-2">
          {folders.map((folder) => {
            const item: TrashItem = { type: "folder", id: folder.id, name: folder.name }
            return (
              <li key={folder.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <FolderIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{folder.name}</p>
                    <p className="text-muted-foreground">
                      Supprimé le {new Date(folder.deletedAt).toLocaleString("fr-FR")}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending && restoringId === folder.id}
                    onClick={() => handleRestore(item)}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Restaurer
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setPurgeTarget(item)}>
                    <Trash2 className="h-4 w-4" />
                    Supprimer définitivement
                  </Button>
                </div>
              </li>
            )
          })}
          {documents.map((document) => {
            const item: TrashItem = { type: "document", id: document.id, name: document.name }
            return (
              <li key={document.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <File className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{document.name}</p>
                    <p className="text-muted-foreground">
                      {formatSize(document.size)} · Supprimé le{" "}
                      {new Date(document.deletedAt).toLocaleString("fr-FR")}
                      {document.uploadedByName ? ` · ${document.uploadedByName}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending && restoringId === document.id}
                    onClick={() => handleRestore(item)}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Restaurer
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setPurgeTarget(item)}>
                    <Trash2 className="h-4 w-4" />
                    Supprimer définitivement
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <AlertDialog
        open={purgeTarget !== null}
        onOpenChange={(next) => {
          if (!next) setPurgeTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer « {purgeTarget?.name} » définitivement ?</AlertDialogTitle>
            <AlertDialogDescription>
              {purgeTarget?.type === "folder"
                ? "Le dossier et tout son contenu seront supprimés définitivement, y compris du stockage. Cette action est irréversible."
                : "Le document et tout son historique de versions seront supprimés définitivement, y compris du stockage. Cette action est irréversible."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isPending}
              onClick={(event) => {
                event.preventDefault()
                handlePurge()
              }}
            >
              {isPending ? "..." : "Supprimer définitivement"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DetailPageLayout>
  )
}
