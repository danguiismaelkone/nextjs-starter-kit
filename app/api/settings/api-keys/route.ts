import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getCurrentOrganization } from "@/lib/organization"
import { createApiKey, listApiKeys } from "@/lib/api-keys"
import { parseJsonBody } from "@/lib/validation"
import { createApiKeySchema } from "@/lib/validators/settings"

/** Liste les clés API de l'organisation active (jamais la clé complète). */
export async function GET() {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 })
  }

  const organization = await getCurrentOrganization()
  if (!organization) {
    return NextResponse.json({ error: "Organisation introuvable." }, { status: 404 })
  }
  if (organization.role !== "owner" && organization.role !== "admin") {
    return NextResponse.json({ error: "Réservé aux administrateurs de l'organisation." }, { status: 403 })
  }

  const apiKeys = await listApiKeys(organization.id)

  return NextResponse.json({
    apiKeys: apiKeys.map((apiKey) => ({
      id: apiKey.id,
      name: apiKey.name,
      prefix: apiKey.prefix,
      createdAt: apiKey.createdAt,
      lastUsedAt: apiKey.lastUsedAt,
      revokedAt: apiKey.revokedAt,
      createdByName: apiKey.createdBy?.name ?? null,
    })),
  })
}

/** Génère une nouvelle clé API — la valeur complète n'est retournée qu'ici, une seule fois. */
export async function POST(request: Request) {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 })
  }

  const organization = await getCurrentOrganization()
  if (!organization) {
    return NextResponse.json({ error: "Organisation introuvable." }, { status: 404 })
  }
  if (organization.role !== "owner" && organization.role !== "admin") {
    return NextResponse.json({ error: "Réservé aux administrateurs de l'organisation." }, { status: 403 })
  }

  const parsed = await parseJsonBody(request, createApiKeySchema)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.message }, { status: 400 })
  }
  const { name } = parsed.data

  const { fullKey, apiKey } = await createApiKey({
    organizationId: organization.id,
    name,
    createdById: session.user.id,
  })

  return NextResponse.json({ key: fullKey, apiKey })
}
