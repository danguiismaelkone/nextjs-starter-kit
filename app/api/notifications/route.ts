import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { countUnreadNotifications, listNotifications } from "@/lib/notifications"

/** Liste les notifications récentes de l'utilisateur courant, avec le compte non lu. */
export async function GET() {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 })
  }

  const [notifications, unreadCount] = await Promise.all([
    listNotifications(session.user.id),
    countUnreadNotifications(session.user.id),
  ])

  return NextResponse.json({ notifications, unreadCount })
}
