"use client"

import { useState } from "react"
import { Copy, Plus } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export interface ApiKeyEntry {
  id: string
  name: string
  prefix: string
  createdAt: string
  lastUsedAt: string | null
  revokedAt: string | null
  createdByName: string | null
}

interface ApiKeysSectionProps {
  initialApiKeys: ApiKeyEntry[]
}

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleString("fr-FR") : "—"
}

/** Génération, liste et révocation des clés API d'organisation (ITEM-047). */
export function ApiKeysSection({ initialApiKeys }: ApiKeysSectionProps) {
  const [apiKeys, setApiKeys] = useState<ApiKeyEntry[]>(initialApiKeys)

  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [revealedKey, setRevealedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const [revokeTarget, setRevokeTarget] = useState<ApiKeyEntry | null>(null)
  const [isRevoking, setIsRevoking] = useState(false)
  const [revokeError, setRevokeError] = useState<string | null>(null)

  async function handleCreate() {
    if (!name.trim()) {
      setCreateError("Le nom est requis.")
      return
    }
    setIsCreating(true)
    setCreateError(null)

    const response = await fetch("/api/settings/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    })
    const data = await response.json().catch(() => ({}))
    setIsCreating(false)

    if (!response.ok) {
      setCreateError(data.error ?? "Échec de la génération.")
      return
    }

    setApiKeys((current) => [
      {
        id: data.apiKey.id,
        name: data.apiKey.name,
        prefix: data.apiKey.prefix,
        createdAt: data.apiKey.createdAt,
        lastUsedAt: null,
        revokedAt: null,
        createdByName: null,
      },
      ...current,
    ])
    setCreateOpen(false)
    setName("")
    setRevealedKey(data.key)
    setCopied(false)
  }

  async function handleCopy() {
    if (!revealedKey) return
    await navigator.clipboard.writeText(revealedKey)
    setCopied(true)
  }

  async function handleRevoke() {
    if (!revokeTarget) return
    setIsRevoking(true)
    setRevokeError(null)

    const response = await fetch(`/api/settings/api-keys/${revokeTarget.id}`, { method: "DELETE" })
    const data = await response.json().catch(() => ({}))
    setIsRevoking(false)

    if (!response.ok) {
      setRevokeError(data.error ?? "Échec de la révocation.")
      return
    }

    setApiKeys((current) =>
      current.map((apiKey) =>
        apiKey.id === revokeTarget.id ? { ...apiKey, revokedAt: new Date().toISOString() } : apiKey
      )
    )
    setRevokeTarget(null)
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Clés API</CardTitle>
        <Button
          size="sm"
          onClick={() => {
            setName("")
            setCreateError(null)
            setCreateOpen(true)
          }}
        >
          <Plus className="h-4 w-4" />
          Nouvelle clé
        </Button>
      </CardHeader>
      <CardContent>
        {apiKeys.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune clé API pour le moment.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Clé</TableHead>
                <TableHead>Créée le</TableHead>
                <TableHead>Dernière utilisation</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.map((apiKey) => {
                const isRevoked = apiKey.revokedAt !== null
                return (
                  <TableRow key={apiKey.id}>
                    <TableCell className="font-medium">{apiKey.name}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">{apiKey.prefix}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(apiKey.createdAt)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(apiKey.lastUsedAt)}</TableCell>
                    <TableCell>
                      <Badge variant={isRevoked ? "destructive" : "secondary"}>
                        {isRevoked ? "Révoquée" : "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {!isRevoked && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setRevokeError(null)
                            setRevokeTarget(apiKey)
                          }}
                        >
                          Révoquer
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Création */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle clé API</DialogTitle>
            <DialogDescription>Donnez un nom à cette clé pour la reconnaître dans la liste.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="api-key-name">Nom</Label>
            <Input
              id="api-key-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex. Intégration Zapier"
              maxLength={100}
              disabled={isCreating}
              autoFocus
            />
          </div>

          {createError && (
            <p role="alert" className="text-sm text-destructive">
              {createError}
            </p>
          )}

          <DialogFooter>
            <Button type="button" onClick={handleCreate} disabled={isCreating}>
              {isCreating ? "Génération..." : "Générer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Révélation unique de la clé complète */}
      <Dialog
        open={revealedKey !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRevealedKey(null)
            setCopied(false)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copiez votre clé API maintenant</DialogTitle>
            <DialogDescription>
              Cette clé ne sera plus jamais affichée en entier. Copiez-la et conservez-la en lieu sûr avant de
              fermer cette fenêtre.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-3 font-mono text-sm">
            <span className="min-w-0 flex-1 truncate">{revealedKey}</span>
            <Button type="button" size="sm" variant="outline" onClick={handleCopy}>
              <Copy className="h-4 w-4" />
              {copied ? "Copié" : "Copier"}
            </Button>
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                setRevealedKey(null)
                setCopied(false)
              }}
            >
              J&apos;ai copié ma clé
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Révocation */}
      <AlertDialog
        open={revokeTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRevokeTarget(null)
            setRevokeError(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Révoquer « {revokeTarget?.name} » ?</AlertDialogTitle>
            <AlertDialogDescription>
              Toute application utilisant cette clé perdra immédiatement l&apos;accès. Cette action est
              irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {revokeError && (
            <p role="alert" className="text-sm text-destructive">
              {revokeError}
            </p>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevoking}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isRevoking}
              onClick={(event) => {
                event.preventDefault()
                handleRevoke()
              }}
            >
              {isRevoking ? "..." : "Révoquer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
