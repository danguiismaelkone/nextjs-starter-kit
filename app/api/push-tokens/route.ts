import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { registerPushToken, unregisterPushToken } from "@/lib/push-notifications"
import { parseJsonBody } from "@/lib/validation"
import { pushTokenSchema } from "@/lib/validators/push-tokens"

/** Enregistre le token FCM de l'appareil courant pour l'utilisateur connecté. */
export async function POST(request: Request) {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 })
  }

  const parsed = await parseJsonBody(request, pushTokenSchema)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.message }, { status: 400 })
  }

  await registerPushToken(session.user.id, parsed.data.token)

  return NextResponse.json({ success: true })
}

/** Désenregistre le token FCM de l'appareil courant. */
export async function DELETE(request: Request) {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 })
  }

  const parsed = await parseJsonBody(request, pushTokenSchema)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.message }, { status: 400 })
  }

  await unregisterPushToken(session.user.id, parsed.data.token)

  return NextResponse.json({ success: true })
}
