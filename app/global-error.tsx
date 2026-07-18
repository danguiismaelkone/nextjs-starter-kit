"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

/**
 * Filet de sécurité pour les erreurs de rendu React non rattrapées côté
 * client (ITEM-062, critère 2) — remplace tout l'arbre (`<html>`/`<body>`
 * propres, exigé par Next.js pour ce fichier) le temps d'afficher un état de
 * secours. Le service de tracking (`lib/error-tracking.ts`, Sentry) tourne
 * uniquement côté serveur (SDK Node) : l'erreur est donc relayée via
 * `/api/client-error` plutôt qu'appelée directement depuis ce composant client.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    fetch("/api/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: error.message, stack: error.stack, digest: error.digest }),
    }).catch(() => {
      // Best-effort : un échec de rapport ne doit jamais bloquer l'affichage du fallback.
    })
  }, [error])

  return (
    <html lang="fr">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
          <h1 className="text-2xl font-semibold">Une erreur inattendue est survenue.</h1>
          <p className="max-w-md text-muted-foreground">
            L&apos;équipe technique a été notifiée. Vous pouvez réessayer ou revenir à l&apos;accueil.
          </p>
          <Button onClick={reset}>Réessayer</Button>
        </div>
      </body>
    </html>
  )
}
