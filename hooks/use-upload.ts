"use client"

import { useCallback } from "react"

export interface UploadedDocument {
  id: string
  name: string
  size: number
  mimeType: string
  createdAt: string
}

export interface UploadResult {
  document?: UploadedDocument
  error?: string
}

interface UploadOptions {
  folderId?: string | null
  onProgress?: (percent: number) => void
}

/**
 * Envoie un fichier vers `app/api/documents/upload` via `XMLHttpRequest` (et
 * non `fetch`) : c'est le seul moyen d'obtenir une vraie progression d'envoi
 * (`upload.onprogress`) côté navigateur.
 */
export function useUpload() {
  const upload = useCallback((file: File, { folderId, onProgress }: UploadOptions = {}): Promise<UploadResult> => {
    return new Promise((resolve) => {
      const formData = new FormData()
      formData.append("file", file)
      if (folderId) formData.append("folderId", folderId)

      const xhr = new XMLHttpRequest()
      xhr.open("POST", "/api/documents/upload")

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100))
      }

      xhr.onload = () => {
        let data: UploadResult = {}
        try {
          data = JSON.parse(xhr.responseText)
        } catch {
          // Réponse non JSON — traitée comme une erreur générique ci-dessous.
        }
        if (xhr.status >= 200 && xhr.status < 300 && data.document) {
          resolve({ document: data.document })
        } else {
          resolve({ error: data.error ?? "Échec de l'upload." })
        }
      }

      xhr.onerror = () => resolve({ error: "Échec de l'upload (réseau)." })
      xhr.send(formData)
    })
  }, [])

  return { upload }
}
