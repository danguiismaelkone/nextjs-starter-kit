import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { GenerateDemo } from "@/components/ai/GenerateDemo"
import { PageHeader } from "@/components/layout/PageHeader"

export default async function AiGeneratePage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <PageHeader
        title="Génération de contenu"
        description="Générez un brouillon de texte à partir d'une instruction, éditable avant insertion."
      />

      <GenerateDemo />
    </div>
  )
}
