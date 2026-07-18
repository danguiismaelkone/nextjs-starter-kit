import { notFound } from "next/navigation"
import { requireOrganization } from "@/lib/organization"
import { getFolderPath, listFolderContents, resolveFolder } from "@/lib/documents"
import { DocumentsExplorer } from "@/components/documents/DocumentsExplorer"

export default async function DocumentsFolderPage({ params }: { params: Promise<{ folderId: string }> }) {
  const { folderId } = await params
  const organization = await requireOrganization()

  const folder = await resolveFolder(organization.id, folderId)
  if (!folder) notFound()

  const [{ folders, documents }, breadcrumb] = await Promise.all([
    listFolderContents(organization.id, folder.id),
    getFolderPath(organization.id, folder.id),
  ])

  return (
    <DocumentsExplorer
      organizationName={organization.name}
      folderId={folder.id}
      breadcrumb={breadcrumb}
      folders={folders.map((f) => ({ id: f.id, name: f.name }))}
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
