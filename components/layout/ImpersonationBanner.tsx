"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { UserCog } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { stopImpersonationAction } from "@/app/(protected)/superadmin/actions"
import { Button } from "@/components/ui/button"

/**
 * Bannière visible en permanence pendant une impersonation (ITEM-050) —
 * `session.impersonatedBy` (plugin Better Auth `admin`) n'est présent que sur
 * une session basculée par `ImpersonateButton`. "Quitter" journalise la fin
 * de session (pendant qu'elle porte encore `impersonatedBy`) avant de la
 * révoquer (`authClient.admin.stopImpersonating`), qui restaure le cookie du
 * super-admin.
 */
export function ImpersonationBanner() {
  const router = useRouter()
  const { data } = authClient.useSession()
  const [isPending, startTransition] = useTransition()

  if (!data?.session.impersonatedBy) return null

  function handleStop() {
    startTransition(async () => {
      await stopImpersonationAction()
      await authClient.admin.stopImpersonating()
      router.push("/superadmin/users")
      router.refresh()
    })
  }

  return (
    <div className="flex items-center justify-between gap-4 bg-amber-500 px-4 py-2 text-sm text-amber-950">
      <div className="flex items-center gap-2">
        <UserCog className="size-4" />
        <span>
          Mode impersonation — connecté(e) en tant que <strong>{data.user.name}</strong> ({data.user.email})
        </span>
      </div>
      <Button size="sm" variant="outline" className="bg-white" disabled={isPending} onClick={handleStop}>
        {isPending ? "..." : "Quitter"}
      </Button>
    </div>
  )
}
