import { requireOrganization } from "@/lib/organization"
import { listTrash, TRASH_RETENTION_DAYS } from "@/lib/documents"
import { TrashView } from "@/components/documents/TrashView"

export default async function TrashPage() {
  const organization = await requireOrganization()
  const { folders, documents } = await listTrash(organization.id)

  return (
    <TrashView
      retentionDays={TRASH_RETENTION_DAYS}
      folders={folders.map((folder) => ({
        id: folder.id,
        name: folder.name,
        deletedAt: (folder.deletedAt as Date).toISOString(),
      }))}
      documents={documents.map((document) => ({
        id: document.id,
        name: document.name,
        size: document.size,
        mimeType: document.mimeType,
        deletedAt: (document.deletedAt as Date).toISOString(),
        uploadedByName: document.uploadedBy?.name ?? null,
      }))}
    />
  )
}
