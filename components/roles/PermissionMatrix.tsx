"use client"

import { useState, useTransition } from "react"
import { toggleRolePermissionAction } from "@/app/(protected)/roles/[id]/actions"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface PermissionMatrixProps {
  roleId: string
  resources: string[]
  actions: string[]
  grantedKeys: string[]
  permissionIdByKey: Record<string, string>
  disabled?: boolean
}

function permissionKey(resource: string, action: string) {
  return `${resource}:${action}`
}

export function PermissionMatrix({
  roleId,
  resources,
  actions,
  grantedKeys,
  permissionIdByKey,
  disabled,
}: PermissionMatrixProps) {
  const [granted, setGranted] = useState(() => new Set(grantedKeys))
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleToggle(resource: string, action: string, checked: boolean) {
    const key = permissionKey(resource, action)
    const permissionId = permissionIdByKey[key]
    if (!permissionId) return

    setError(null)
    // Mise à jour optimiste : la case reflète immédiatement le choix, avant la
    // confirmation serveur (critère "immédiatement appliquées").
    setGranted((prev) => {
      const next = new Set(prev)
      if (checked) next.add(key)
      else next.delete(key)
      return next
    })

    startTransition(async () => {
      const result = await toggleRolePermissionAction(roleId, permissionId, checked)
      if (result.error) {
        setError(result.error)
        setGranted((prev) => {
          const next = new Set(prev)
          if (checked) next.delete(key)
          else next.add(key)
          return next
        })
      }
    })
  }

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ressource</TableHead>
              {actions.map((action) => (
                <TableHead key={action} className="text-center capitalize">
                  {action}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {resources.map((resource) => (
              <TableRow key={resource}>
                <TableCell className="font-medium capitalize">{resource}</TableCell>
                {actions.map((action) => {
                  const key = permissionKey(resource, action)
                  const exists = key in permissionIdByKey
                  return (
                    <TableCell key={action} className="text-center">
                      {exists ? (
                        <Checkbox
                          checked={granted.has(key)}
                          disabled={disabled || isPending}
                          aria-label={`${resource}:${action}`}
                          onCheckedChange={(checked) => handleToggle(resource, action, checked === true)}
                        />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
