"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { useDropzone } from "react-dropzone"
import { FileText, UploadCloud } from "lucide-react"
import { cn } from "@/lib/utils"
import { useUpload } from "@/hooks/use-upload"

const MAX_SIZE = 20 * 1024 * 1024 // 20 Mo — synchronisé avec app/api/documents/upload/route.ts
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"]

interface PendingFile {
  id: string
  file: File
  previewUrl: string | null
  progress: number
  status: "uploading" | "done" | "error"
  error?: string
}

interface FileUploadProps {
  /** Dossier courant (`null` = racine). */
  folderId?: string | null
}

export function FileUpload({ folderId = null }: FileUploadProps) {
  const router = useRouter()
  const { upload } = useUpload()
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: { file: File }[]) => {
      const rejected: PendingFile[] = rejectedFiles.map(({ file }) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: null,
        progress: 0,
        status: "error",
        error: file.size > MAX_SIZE ? `Trop volumineux (max ${MAX_SIZE / (1024 * 1024)} Mo).` : "Type non accepté.",
      }))

      const accepted: PendingFile[] = acceptedFiles.map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
        progress: 0,
        status: "uploading",
      }))

      setPendingFiles((current) => [...current, ...rejected, ...accepted])

      accepted.forEach((pending) => {
        upload(pending.file, {
          folderId,
          onProgress: (progress) => {
            setPendingFiles((current) => current.map((f) => (f.id === pending.id ? { ...f, progress } : f)))
          },
        }).then((result) => {
          setPendingFiles((current) =>
            current.map((f) =>
              f.id === pending.id
                ? { ...f, status: result.document ? "done" : "error", error: result.error, progress: 100 }
                : f
            )
          )
          if (result.document) router.refresh()
        })
      })
    },
    [upload, folderId, router]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    accept: Object.fromEntries(ACCEPTED_TYPES.map((type) => [type, []])),
    maxSize: MAX_SIZE,
  })

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground transition-colors",
          isDragActive && "border-primary bg-primary/5"
        )}
      >
        <input {...getInputProps()} />
        <UploadCloud className="h-8 w-8" />
        <p>Glissez-déposez un fichier ici, ou cliquez pour en choisir un.</p>
        <p className="text-xs">PDF, JPEG, PNG, WebP — {MAX_SIZE / (1024 * 1024)} Mo max.</p>
      </div>

      {pendingFiles.length > 0 && (
        <ul className="space-y-2">
          {pendingFiles.map((pending) => (
            <li key={pending.id} className="flex items-center gap-3 rounded-md border p-2 text-sm">
              {pending.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- preview local (blob:), pas une ressource optimisable par next/image
                <img src={pending.previewUrl} alt="" className="h-10 w-10 rounded object-cover" />
              ) : (
                <FileText className="h-10 w-10 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{pending.file.name}</p>
                {pending.status === "uploading" && (
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${pending.progress}%` }}
                    />
                  </div>
                )}
                {pending.status === "error" && <p className="text-destructive">{pending.error}</p>}
                {pending.status === "done" && <p className="text-green-600">Envoyé.</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
