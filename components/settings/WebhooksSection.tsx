"use client"

import { useState } from "react"
import { Copy, Loader2, Plus } from "lucide-react"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { WEBHOOK_EVENT_TYPES, type WebhookEventType } from "@/lib/webhook-events"

export interface WebhookEntry {
  id: string
  url: string
  events: string[]
  enabled: boolean
  createdAt: string
  createdByName: string | null
}

interface DeliveryEntry {
  id: string
  event: string
  statusCode: number | null
  success: boolean
  errorMessage: string | null
  createdAt: string
}

interface WebhooksSectionProps {
  initialWebhooks: WebhookEntry[]
}

const ALL_EVENT_TYPES = Object.keys(WEBHOOK_EVENT_TYPES) as WebhookEventType[]

function formatDate(value: string): string {
  return new Date(value).toLocaleString("fr-FR")
}

/** Configuration des webhooks sortants d'organisation (ITEM-048). */
export function WebhooksSection({ initialWebhooks }: WebhooksSectionProps) {
  const [webhooks, setWebhooks] = useState<WebhookEntry[]>(initialWebhooks)

  const [createOpen, setCreateOpen] = useState(false)
  const [url, setUrl] = useState("")
  const [selectedEvents, setSelectedEvents] = useState<WebhookEventType[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [revealedSecret, setRevealedSecret] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<WebhookEntry | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [historyTarget, setHistoryTarget] = useState<WebhookEntry | null>(null)
  const [deliveries, setDeliveries] = useState<DeliveryEntry[] | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [redeliveringId, setRedeliveringId] = useState<string | null>(null)

  function toggleEvent(event: WebhookEventType, checked: boolean) {
    setSelectedEvents((current) => (checked ? [...current, event] : current.filter((e) => e !== event)))
  }

  async function handleCreate() {
    if (!url.trim()) {
      setCreateError("L'URL est requise.")
      return
    }
    if (selectedEvents.length === 0) {
      setCreateError("Sélectionnez au moins un type d'événement.")
      return
    }
    setIsCreating(true)
    setCreateError(null)

    const response = await fetch("/api/settings/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url.trim(), events: selectedEvents }),
    })
    const data = await response.json().catch(() => ({}))
    setIsCreating(false)

    if (!response.ok) {
      setCreateError(data.error ?? "Échec de la création.")
      return
    }

    setWebhooks((current) => [data.webhook, ...current])
    setCreateOpen(false)
    setUrl("")
    setSelectedEvents([])
    setRevealedSecret(data.webhook.secret)
    setCopied(false)
  }

  async function handleCopySecret() {
    if (!revealedSecret) return
    await navigator.clipboard.writeText(revealedSecret)
    setCopied(true)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    setDeleteError(null)

    const response = await fetch(`/api/settings/webhooks/${deleteTarget.id}`, { method: "DELETE" })
    const data = await response.json().catch(() => ({}))
    setIsDeleting(false)

    if (!response.ok) {
      setDeleteError(data.error ?? "Échec de la suppression.")
      return
    }

    setWebhooks((current) => current.filter((webhook) => webhook.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  function openHistory(webhook: WebhookEntry) {
    setHistoryTarget(webhook)
    setDeliveries(null)
    setHistoryError(null)

    fetch(`/api/settings/webhooks/${webhook.id}/deliveries`)
      .then(async (response) => {
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          setHistoryError(data.error ?? "Impossible de charger l'historique.")
          return
        }
        setDeliveries(data.deliveries ?? [])
      })
      .catch(() => setHistoryError("Impossible de charger l'historique."))
  }

  async function handleRedeliver(deliveryId: string) {
    if (!historyTarget) return
    setRedeliveringId(deliveryId)
    setHistoryError(null)

    const response = await fetch(
      `/api/settings/webhooks/${historyTarget.id}/deliveries/${deliveryId}/redeliver`,
      { method: "POST" }
    )
    const data = await response.json().catch(() => ({}))
    setRedeliveringId(null)

    if (!response.ok) {
      setHistoryError(data.error ?? "Échec du renvoi.")
      return
    }
    if (data.delivery) {
      setDeliveries((current) => [data.delivery, ...(current ?? [])])
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Webhooks</CardTitle>
        <Button
          size="sm"
          onClick={() => {
            setUrl("")
            setSelectedEvents([])
            setCreateError(null)
            setCreateOpen(true)
          }}
        >
          <Plus className="h-4 w-4" />
          Nouveau webhook
        </Button>
      </CardHeader>
      <CardContent>
        {webhooks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun webhook configuré.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>URL</TableHead>
                <TableHead>Événements</TableHead>
                <TableHead>Créé le</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {webhooks.map((webhook) => (
                <TableRow key={webhook.id}>
                  <TableCell className="max-w-56 truncate font-mono text-sm">{webhook.url}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {webhook.events.map((event) => (
                        <Badge key={event} variant="outline">
                          {event}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(webhook.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => openHistory(webhook)}>
                        Historique
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setDeleteError(null)
                          setDeleteTarget(webhook)
                        }}
                      >
                        Supprimer
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Création */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau webhook</DialogTitle>
            <DialogDescription>URL cible et types d&apos;événements à recevoir.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="webhook-url">URL cible</Label>
            <Input
              id="webhook-url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://exemple.com/webhooks/notre-app"
              disabled={isCreating}
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Événements</Label>
            {ALL_EVENT_TYPES.map((event) => (
              <div key={event} className="flex items-center gap-2">
                <Checkbox
                  id={`event-${event}`}
                  checked={selectedEvents.includes(event)}
                  onCheckedChange={(checked) => toggleEvent(event, checked === true)}
                  disabled={isCreating}
                />
                <Label htmlFor={`event-${event}`} className="text-sm font-normal">
                  <span className="font-mono text-xs text-muted-foreground">{event}</span> — {WEBHOOK_EVENT_TYPES[event]}
                </Label>
              </div>
            ))}
          </div>

          {createError && (
            <p role="alert" className="text-sm text-destructive">
              {createError}
            </p>
          )}

          <DialogFooter>
            <Button type="button" onClick={handleCreate} disabled={isCreating}>
              {isCreating ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Révélation unique du secret */}
      <Dialog
        open={revealedSecret !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRevealedSecret(null)
            setCopied(false)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copiez votre secret de signature maintenant</DialogTitle>
            <DialogDescription>
              Ce secret sert à vérifier l&apos;authenticité des envois (en-tête{" "}
              <code className="font-mono">X-Webhook-Signature</code>). Copiez-le et conservez-le en lieu sûr.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-3 font-mono text-sm">
            <span className="min-w-0 flex-1 truncate">{revealedSecret}</span>
            <Button type="button" size="sm" variant="outline" onClick={handleCopySecret}>
              <Copy className="h-4 w-4" />
              {copied ? "Copié" : "Copier"}
            </Button>
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                setRevealedSecret(null)
                setCopied(false)
              }}
            >
              J&apos;ai copié mon secret
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suppression */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null)
            setDeleteError(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce webhook ?</AlertDialogTitle>
            <AlertDialogDescription>
              Plus aucun événement ne sera envoyé à « {deleteTarget?.url} ». Son historique sera également supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deleteError && (
            <p role="alert" className="text-sm text-destructive">
              {deleteError}
            </p>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault()
                handleDelete()
              }}
            >
              {isDeleting ? "..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Historique */}
      <Dialog
        open={historyTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setHistoryTarget(null)
            setDeliveries(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Historique des envois</DialogTitle>
            <DialogDescription className="truncate">{historyTarget?.url}</DialogDescription>
          </DialogHeader>

          {deliveries === null && !historyError && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {historyError && (
            <p role="alert" className="text-sm text-destructive">
              {historyError}
            </p>
          )}

          {deliveries !== null && deliveries.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucun envoi pour le moment.</p>
          )}

          {deliveries !== null && deliveries.length > 0 && (
            <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
              {deliveries.map((delivery) => (
                <li key={delivery.id} className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{delivery.event}</Badge>
                      <Badge variant={delivery.success ? "secondary" : "destructive"}>
                        {delivery.statusCode ?? "Échec réseau"}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate text-muted-foreground">{formatDate(delivery.createdAt)}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={redeliveringId === delivery.id}
                    onClick={() => handleRedeliver(delivery.id)}
                  >
                    {redeliveringId === delivery.id ? "..." : "Renvoyer"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
