import { requireOrganization } from "@/lib/organization"
import { listFolderContents } from "@/lib/documents"
import { DocumentsExplorer } from "@/components/documents/DocumentsExplorer"

export default async function DocumentsPage() {
  const organization = await requireOrganization()
  const { folders, documents } = await listFolderContents(organization.id, null)

  return (
    <DocumentsExplorer
      organizationName={organization.name}
      folderId={null}
      breadcrumb={[]}
      folders={folders.map((folder) => ({ id: folder.id, name: folder.name }))}
      documents={documents.map((document) => ({
        id: document.id,
        name: document.name,
        size: document.size,
        mimeType: document.mimeType,
        createdAt: document.createdAt.toISOString(),
        uploadedByName: document.uploadedBy?.name ?? null,
      }))}
    />
  )
}
