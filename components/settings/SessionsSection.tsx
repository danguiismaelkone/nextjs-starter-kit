"use client"

import { useEffect, useState } from "react"
import { Loader2, Monitor } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface SessionEntry {
  id: string
  token: string
  ipAddress: string | null
  userAgent: string | null
  updatedAt: string
}

function parseDevice(userAgent: string | null): string {
  if (!userAgent) return "Appareil inconnu"
  if (/mobile/i.test(userAgent)) return "Mobile"
  if (/Macintosh/i.test(userAgent)) return "Mac"
  if (/Windows/i.test(userAgent)) return "Windows"
  if (/Linux/i.test(userAgent)) return "Linux"
  return "Ordinateur"
}

/** Sessions actives + révocation à distance (ITEM-046) — API Better Auth de base, sans plugin. */
export function SessionsSection() {
  const { data: currentSession } = authClient.useSession()
  const [sessions, setSessions] = useState<SessionEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [revokingToken, setRevokingToken] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)

  useEffect(() => {
    let cancelled = false

    authClient.listSessions().then(({ data, error: listError }) => {
      if (cancelled) return
      if (listError) {
        setError(listError.message ?? "Impossible de charger les sessions.")
        return
      }
      setSessions(
        (data ?? []).map((session) => ({
          id: session.id,
          token: session.token,
          ipAddress: session.ipAddress ?? null,
          userAgent: session.userAgent ?? null,
          updatedAt: typeof session.updatedAt === "string" ? session.updatedAt : session.updatedAt.toISOString(),
        }))
      )
    })

    return () => {
      cancelled = true
    }
  }, [refreshToken])

  async function handleRevoke(token: string) {
    setRevokingToken(token)
    setError(null)
    const { error: revokeError } = await authClient.revokeSession({ token })
    setRevokingToken(null)
    if (revokeError) {
      setError(revokeError.message ?? "Échec de la révocation.")
      return
    }
    setRefreshToken((current) => current + 1)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sessions actives</CardTitle>
        <CardDescription>Appareils actuellement connectés à votre compte.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {sessions === null && !error && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        {sessions && sessions.length === 0 && <p className="text-sm text-muted-foreground">Aucune session active.</p>}

        {sessions && sessions.length > 0 && (
          <ul className="flex flex-col gap-2">
            {sessions.map((session) => {
              const isCurrent = session.token === currentSession?.session.token
              return (
                <li
                  key={session.id}
                  className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Monitor className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">{parseDevice(session.userAgent)}</p>
                        {isCurrent && <Badge variant="secondary">Cet appareil</Badge>}
                      </div>
                      <p className="truncate text-muted-foreground">
                        {session.ipAddress ?? "IP inconnue"} — dernière activité le{" "}
                        {new Date(session.updatedAt).toLocaleString("fr-FR")}
                      </p>
                    </div>
                  </div>
                  {!isCurrent && (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={revokingToken === session.token}
                      onClick={() => handleRevoke(session.token)}
                    >
                      {revokingToken === session.token ? "..." : "Révoquer"}
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
