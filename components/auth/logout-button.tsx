"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { signOut } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"

export function LogoutButton() {
  const router = useRouter()
  const [isPending, setIsPending] = React.useState(false)

  async function handleLogout() {
    setIsPending(true)
    await signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <Button
      variant="outline"
      onClick={handleLogout}
      disabled={isPending}
    >
      {isPending ? "Déconnexion…" : "Se déconnecter"}
    </Button>
  )
}
