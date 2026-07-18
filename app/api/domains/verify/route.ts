import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { normalizeHost } from "@/lib/domains"

/**
 * Callback `on_demand_tls.ask` de Caddy (ITEM-068, `caddy/Caddyfile`) — appelé
 * depuis le réseau Docker interne avant toute émission/renouvellement
 * automatique d'un certificat Let's Encrypt pour un domaine inconnu de Caddy.
 * 200 seulement si `domain` correspond à un `Organization.customDomain`
 * existant (renseigné via `/settings/organizations/[id]/domain`, réservé aux
 * owner/admin) — jamais un simple "oui" pour n'importe quel hostname, ce qui
 * transformerait ce endpoint en oracle permettant de faire émettre des
 * certificats pour des domaines arbitraires au nom de cette plateforme.
 */
export async function GET(request: Request) {
  const domain = normalizeHost(new URL(request.url).searchParams.get("domain"))
  if (!domain) return new NextResponse(null, { status: 400 })

  const organization = await prisma.organization.findUnique({ where: { customDomain: domain } })
  return new NextResponse(null, { status: organization ? 200 : 404 })
}
