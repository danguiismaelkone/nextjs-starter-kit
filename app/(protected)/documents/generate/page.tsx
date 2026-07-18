import { notFound } from "next/navigation"
import { requireOrganization } from "@/lib/organization"
import { resolveFolder } from "@/lib/documents"
import { GenerateDocumentForm } from "@/components/documents/GenerateDocumentForm"
import { PageHeader } from "@/components/layout/PageHeader"

interface GenerateDocumentPageProps {
  searchParams: Promise<{ folderId?: string }>
}

export default async function GenerateDocumentPage({ searchParams }: GenerateDocumentPageProps) {
  const organization = await requireOrganization()
  const { folderId } = await searchParams

  if (folderId) {
    const folder = await resolveFolder(organization.id, folderId)
    if (!folder) notFound()
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <PageHeader
        title="Nouveau document IA"
        description="Décrivez le document souhaité — l'IA génère un premier jet stocké dans vos documents, éditable ensuite comme n'importe quel fichier."
      />

      <GenerateDocumentForm folderId={folderId ?? null} />
    </div>
  )
}
