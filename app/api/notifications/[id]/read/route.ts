import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { markNotificationRead } from "@/lib/notifications"

/** Marque une notification comme lue. */
export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 })
  }

  const found = await markNotificationRead(session.user.id, id)
  if (!found) {
    return NextResponse.json({ error: "Notification introuvable." }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
