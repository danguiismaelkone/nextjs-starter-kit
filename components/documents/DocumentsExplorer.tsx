"use client"

import { Fragment, useState, useTransition, type DragEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Folder as FolderIcon, Plus, Sparkles, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu"
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
import { FileUpload } from "@/components/upload/FileUpload"
import { FolderDialog } from "@/components/documents/FolderDialog"
import { DocumentPreview } from "@/components/documents/DocumentPreview"
import { VersionHistory } from "@/components/documents/VersionHistory"
import { ShareDialog } from "@/components/documents/ShareDialog"
import { OcrDialog } from "@/components/documents/OcrDialog"
import { SummaryDialog } from "@/components/documents/SummaryDialog"
import { DocumentSearch } from "@/components/documents/DocumentSearch"
import { PageHeader } from "@/components/layout/PageHeader"
import { cn } from "@/lib/utils"

export interface BreadcrumbEntry {
  id: string
  name: string
}

export interface FolderEntry {
  id: string
  name: string
}

export interface DocumentEntry {
  id: string
  name: string
  size: number
  mimeType: string
  createdAt: string
  uploadedByName: string | null
}

interface DocumentsExplorerProps {
  organizationName: string
  /** Dossier courant (`null` = racine). */
  folderId: string | null
  /** De la racine (exclue) jusqu'au dossier courant (inclus). */
  breadcrumb: BreadcrumbEntry[]
  folders: FolderEntry[]
  documents: DocumentEntry[]
}

type DragPayload = { type: "folder"; id: string } | { type: "document"; id: string }

const DRAG_MIME_TYPE = "application/x-document-item"

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

export function DocumentsExplorer({ organizationName, folderId, breadcrumb, folders, documents }: DocumentsExplorerProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [renameFolder, setRenameFolder] = useState<FolderEntry | null>(null)
  const [deleteFolder, setDeleteFolder] = useState<FolderEntry | null>(null)
  const [previewDocument, setPreviewDocument] = useState<DocumentEntry | null>(null)
  const [historyDocument, setHistoryDocument] = useState<DocumentEntry | null>(null)
  const [deleteDocument, setDeleteDocument] = useState<DocumentEntry | null>(null)
  const [shareDocument, setShareDocument] = useState<DocumentEntry | null>(null)
  const [ocrDocument, setOcrDocument] = useState<DocumentEntry | null>(null)
  const [summaryDocument, setSummaryDocument] = useState<DocumentEntry | null>(null)

  const ROOT_DROP_ID = "__root__"

  function moveItem(payload: DragPayload, targetFolderId: string | null) {
    setError(null)
    const url = payload.type === "folder" ? `/api/folders/${payload.id}` : `/api/documents/${payload.id}`
    const body = payload.type === "folder" ? { parentId: targetFolderId } : { folderId: targetFolderId }

    startTransition(async () => {
      const response = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? "Échec du déplacement.")
        return
      }
      router.refresh()
    })
  }

  function handleDeleteFolder() {
    if (!deleteFolder) return
    setError(null)
    startTransition(async () => {
      const response = await fetch(`/api/folders/${deleteFolder.id}`, { method: "DELETE" })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? "Échec de la suppression.")
        return
      }
      setDeleteFolder(null)
      router.refresh()
    })
  }

  function handleDeleteDocument() {
    if (!deleteDocument) return
    setError(null)
    startTransition(async () => {
      const response = await fetch(`/api/documents/${deleteDocument.id}`, { method: "DELETE" })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? "Échec de la suppression.")
        return
      }
      setDeleteDocument(null)
      router.refresh()
    })
  }

  function handleDragStart(event: DragEvent, payload: DragPayload) {
    event.dataTransfer.setData(DRAG_MIME_TYPE, JSON.stringify(payload))
    event.dataTransfer.effectAllowed = "move"
  }

  function handleDragOver(event: DragEvent, targetId: string) {
    if (!event.dataTransfer.types.includes(DRAG_MIME_TYPE)) return
    event.preventDefault()
    setDragOverTarget(targetId)
  }

  function handleDrop(event: DragEvent, targetFolderId: string | null) {
    event.preventDefault()
    setDragOverTarget(null)
    const raw = event.dataTransfer.getData(DRAG_MIME_TYPE)
    if (!raw) return
    let payload: DragPayload
    try {
      payload = JSON.parse(raw)
    } catch {
      return
    }
    if (payload.type === "folder" && payload.id === targetFolderId) return
    moveItem(payload, targetFolderId)
  }

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem
            onDragOver={(event) => handleDragOver(event, ROOT_DROP_ID)}
            onDragLeave={() => setDragOverTarget(null)}
            onDrop={(event) => handleDrop(event, null)}
            className={cn("rounded px-1", dragOverTarget === ROOT_DROP_ID && "bg-primary/10")}
          >
            {folderId === null ? (
              <BreadcrumbPage>Documents</BreadcrumbPage>
            ) : (
              <BreadcrumbLink asChild>
                <Link href="/documents">Documents</Link>
              </BreadcrumbLink>
            )}
          </BreadcrumbItem>
          {breadcrumb.map((entry, index) => (
            <Fragment key={entry.id}>
              <BreadcrumbSeparator />
              <BreadcrumbItem
                onDragOver={(event) => handleDragOver(event, entry.id)}
                onDragLeave={() => setDragOverTarget(null)}
                onDrop={(event) => handleDrop(event, entry.id)}
                className={cn("rounded px-1", dragOverTarget === entry.id && "bg-primary/10")}
              >
                {index === breadcrumb.length - 1 ? (
                  <BreadcrumbPage>{entry.name}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={`/documents/${entry.id}`}>{entry.name}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <PageHeader
        title="Documents"
        description={`Fichiers partagés de ${organizationName}.`}
        actions={[
          {
            key: "trash",
            content: (
              <Button size="sm" variant="outline" asChild>
                <Link href="/documents/trash">
                  <Trash2 className="h-4 w-4" />
                  Corbeille
                </Link>
              </Button>
            ),
          },
          {
            key: "generate",
            content: (
              <Button size="sm" variant="outline" asChild>
                <Link href={folderId ? `/documents/generate?folderId=${folderId}` : "/documents/generate"}>
                  <Sparkles className="h-4 w-4" />
                  Nouveau document IA
                </Link>
              </Button>
            ),
          },
          {
            key: "new-folder",
            content: (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Nouveau dossier
              </Button>
            ),
          },
        ]}
      />

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <DocumentSearch>
        {folders.length > 0 && (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {folders.map((folder) => (
              <ContextMenu key={folder.id}>
                <ContextMenuTrigger asChild>
                  <li
                    draggable
                    onDragStart={(event) => handleDragStart(event, { type: "folder", id: folder.id })}
                    onDragOver={(event) => handleDragOver(event, folder.id)}
                    onDragLeave={() => setDragOverTarget(null)}
                    onDrop={(event) => handleDrop(event, folder.id)}
                    onClick={() => router.push(`/documents/${folder.id}`)}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition-colors hover:bg-muted",
                      dragOverTarget === folder.id && "border-primary bg-primary/5"
                    )}
                  >
                    <FolderIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <span className="truncate font-medium">{folder.name}</span>
                  </li>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem onSelect={() => router.push(`/documents/${folder.id}`)}>Ouvrir</ContextMenuItem>
                  <ContextMenuItem onSelect={() => setRenameFolder(folder)}>Renommer</ContextMenuItem>
                  {folderId !== null && (
                    <ContextMenuItem onSelect={() => moveItem({ type: "folder", id: folder.id }, null)}>
                      Déplacer vers la racine
                    </ContextMenuItem>
                  )}
                  <ContextMenuItem variant="destructive" onSelect={() => setDeleteFolder(folder)}>
                    Supprimer
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            ))}
          </ul>
        )}

        <FileUpload folderId={folderId} />

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Taille</TableHead>
                <TableHead>Ajouté par</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {folders.length === 0 && documents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Aucun document pour le moment.
                  </TableCell>
                </TableRow>
              )}
              {documents.map((document) => (
                <ContextMenu key={document.id}>
                  <ContextMenuTrigger asChild>
                    <TableRow
                      draggable
                      onDragStart={(event) => handleDragStart(event, { type: "document", id: document.id })}
                      onClick={() => setPreviewDocument(document)}
                      className="cursor-pointer"
                    >
                      <TableCell className="font-medium">{document.name}</TableCell>
                      <TableCell className="text-muted-foreground">{document.mimeType}</TableCell>
                      <TableCell>{formatSize(document.size)}</TableCell>
                      <TableCell>{document.uploadedByName ?? "—"}</TableCell>
                      <TableCell>{new Date(document.createdAt).toLocaleDateString("fr-FR")}</TableCell>
                    </TableRow>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onSelect={() => setHistoryDocument(document)}>
                      Historique des versions
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={() => setShareDocument(document)}>Partager</ContextMenuItem>
                    <ContextMenuItem onSelect={() => setOcrDocument(document)}>Extraire le texte</ContextMenuItem>
                    <ContextMenuItem onSelect={() => setSummaryDocument(document)}>Résumer</ContextMenuItem>
                    {folderId !== null ? (
                      <ContextMenuItem onSelect={() => moveItem({ type: "document", id: document.id }, null)}>
                        Déplacer vers la racine
                      </ContextMenuItem>
                    ) : (
                      <ContextMenuItem disabled>Déjà à la racine</ContextMenuItem>
                    )}
                    <ContextMenuItem variant="destructive" onSelect={() => setDeleteDocument(document)}>
                      Supprimer
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ))}
            </TableBody>
          </Table>
        </div>
      </DocumentSearch>

      <FolderDialog
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
        parentId={folderId}
        onSuccess={() => router.refresh()}
      />
      <FolderDialog
        mode="rename"
        open={renameFolder !== null}
        onOpenChange={(next) => {
          if (!next) setRenameFolder(null)
        }}
        folder={renameFolder}
        onSuccess={() => router.refresh()}
      />

      <AlertDialog
        open={deleteFolder !== null}
        onOpenChange={(next) => {
          if (!next) setDeleteFolder(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer « {deleteFolder?.name} » ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le dossier et tout son contenu (sous-dossiers, documents) seront retirés de cette vue. Rien
              n&apos;est supprimé définitivement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isPending}
              onClick={(event) => {
                event.preventDefault()
                handleDeleteFolder()
              }}
            >
              {isPending ? "..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteDocument !== null}
        onOpenChange={(next) => {
          if (!next) setDeleteDocument(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer « {deleteDocument?.name} » ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le document sera envoyé à la corbeille, où il reste restaurable. Rien n&apos;est supprimé
              définitivement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isPending}
              onClick={(event) => {
                event.preventDefault()
                handleDeleteDocument()
              }}
            >
              {isPending ? "..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DocumentPreview
        document={previewDocument}
        onOpenChange={(next) => {
          if (!next) setPreviewDocument(null)
        }}
      />

      <VersionHistory
        document={historyDocument}
        onOpenChange={(next) => {
          if (!next) setHistoryDocument(null)
        }}
      />

      <ShareDialog
        document={shareDocument}
        onOpenChange={(next) => {
          if (!next) setShareDocument(null)
        }}
      />

      <OcrDialog
        document={ocrDocument}
        onOpenChange={(next) => {
          if (!next) setOcrDocument(null)
        }}
      />

      <SummaryDialog
        document={summaryDocument}
        onOpenChange={(next) => {
          if (!next) setSummaryDocument(null)
        }}
      />
    </div>
  )
}
