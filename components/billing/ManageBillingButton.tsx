"use client"

import { useState, useTransition } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ManageBillingButton() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    setError(null)
    startTransition(async () => {
      const response = await fetch("/api/billing/portal", { method: "POST" })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.url) {
        setError(data.error ?? "Impossible d'ouvrir le portail Stripe.")
        return
      }
      window.location.href = data.url
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" disabled={isPending} onClick={handleClick}>
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Gérer le moyen de paiement
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
