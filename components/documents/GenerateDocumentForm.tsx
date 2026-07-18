"use client"

import { useState, useTransition, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const DOCUMENT_TYPES = [
  { value: "contract", label: "Contrat" },
  { value: "report", label: "Rapport" },
  { value: "letter", label: "Lettre" },
  { value: "note", label: "Note interne" },
  { value: "other", label: "Autre" },
] as const

interface GenerateDocumentFormProps {
  /** Dossier de destination — `null` = racine de l'espace documents. */
  folderId: string | null
}

/** Formulaire « Nouveau document IA » (ITEM-044) : description + type → document généré et stocké. */
export function GenerateDocumentForm({ folderId }: GenerateDocumentFormProps) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [documentType, setDocumentType] = useState<(typeof DOCUMENT_TYPES)[number]["value"]>("report")
  const [description, setDescription] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim() || !description.trim()) {
      setError("Le titre et la description sont requis.")
      return
    }
    setError(null)

    startTransition(async () => {
      const response = await fetch("/api/documents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, documentType, description, folderId }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? "Échec de la génération du document.")
        return
      }

      const destination = data.document?.folderId ? `/documents/${data.document.folderId}` : "/documents"
      router.push(destination)
      router.refresh()
    })
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="generate-name">Titre du document</Label>
            <Input
              id="generate-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex. Contrat de prestation — Acme"
              maxLength={150}
              disabled={isPending}
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="generate-type">Type de document</Label>
            <Select value={documentType} onValueChange={(value) => setDocumentType(value as typeof documentType)}>
              <SelectTrigger id="generate-type" className="w-full" disabled={isPending}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="generate-description">Description</Label>
            <Textarea
              id="generate-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Décrivez le contenu attendu : contexte, informations clés, ton..."
              rows={8}
              disabled={isPending}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" disabled={isPending} className="w-fit">
            {isPending ? "Génération..." : "Générer le document"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
