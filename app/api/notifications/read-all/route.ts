import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { markAllNotificationsRead } from "@/lib/notifications"

/** Marque toutes les notifications de l'utilisateur courant comme lues. */
export async function PATCH() {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 })
  }

  await markAllNotificationsRead(session.user.id)

  return NextResponse.json({ success: true })
}
