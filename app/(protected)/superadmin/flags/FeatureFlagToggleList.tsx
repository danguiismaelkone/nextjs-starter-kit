"use client"

import { useState, useTransition } from "react"
import { setOrganizationFeatureFlagAction } from "../actions"
import { Switch } from "@/components/ui/switch"

interface FeatureFlagRow {
  key: string
  description: string
  enabled: boolean
}

interface FeatureFlagToggleListProps {
  organizationId: string
  flags: FeatureFlagRow[]
}

/** Bascule immédiate (optimiste) par flag, même schéma que `PermissionMatrix` (ITEM-019). */
export function FeatureFlagToggleList({ organizationId, flags }: FeatureFlagToggleListProps) {
  const [enabled, setEnabled] = useState(() => new Map(flags.map((flag) => [flag.key, flag.enabled])))
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function handleToggle(key: string, checked: boolean) {
    setError(null)
    setPendingKey(key)
    setEnabled((prev) => new Map(prev).set(key, checked))

    startTransition(async () => {
      const result = await setOrganizationFeatureFlagAction(organizationId, key, checked)
      if (result.error) {
        setError(result.error)
        setEnabled((prev) => new Map(prev).set(key, !checked))
      }
      setPendingKey(null)
    })
  }

  if (flags.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun feature flag défini.</p>
  }

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="divide-y rounded-lg border">
        {flags.map((flag) => (
          <div key={flag.key} className="flex items-center justify-between gap-4 p-3">
            <div>
              <p className="text-sm font-medium">{flag.key}</p>
              <p className="text-sm text-muted-foreground">{flag.description}</p>
            </div>
            <Switch
              checked={enabled.get(flag.key) ?? false}
              disabled={pendingKey === flag.key}
              onCheckedChange={(checked) => handleToggle(flag.key, checked)}
              aria-label={flag.key}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
