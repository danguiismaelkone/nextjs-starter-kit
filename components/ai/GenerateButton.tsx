"use client"

import { useState } from "react"
import { Loader2, Sparkles } from "lucide-react"
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
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

interface GenerateButtonProps {
  /** Valeur actuelle du champ d'origine — sert à détecter un contenu à écraser (critère d'acceptation). */
  value: string
  onChange: (value: string) => void
  /** Contexte optionnel transmis à l'IA en plus de l'instruction (ex. nom de l'organisation). */
  context?: string
  label?: string
  instructionPlaceholder?: string
}

/**
 * Point d'entrée générique « Générer avec l'IA » (ITEM-041), réutilisable sur
 * n'importe quel champ texte contrôlé. Ne remplace jamais silencieusement un
 * contenu existant : une confirmation est demandée si `value` n'est pas vide.
 */
export function GenerateButton({
  value,
  onChange,
  context,
  label = "Générer avec l'IA",
  instructionPlaceholder = "Décrivez ce que vous voulez générer...",
}: GenerateButtonProps) {
  const [open, setOpen] = useState(false)
  const [instruction, setInstruction] = useState("")
  const [result, setResult] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  function reset() {
    setInstruction("")
    setResult(null)
    setError(null)
  }

  async function handleGenerate() {
    if (!instruction.trim() || isGenerating) return
    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: instruction, context }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? "Échec de la génération.")
        return
      }
      setResult(typeof data.text === "string" ? data.text : "")
    } catch {
      setError("Échec de la génération.")
    } finally {
      setIsGenerating(false)
    }
  }

  function applyResult() {
    if (result === null) return
    onChange(result)
    setConfirmOpen(false)
    setOpen(false)
    reset()
  }

  function handleInsert() {
    if (result === null) return
    if (value.trim().length > 0) {
      setConfirmOpen(true)
      return
    }
    applyResult()
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          reset()
          setOpen(true)
        }}
      >
        <Sparkles className="h-4 w-4" />
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Générer avec l&apos;IA</DialogTitle>
            <DialogDescription>Décrivez le texte que vous souhaitez obtenir.</DialogDescription>
          </DialogHeader>

          <Textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder={instructionPlaceholder}
            rows={3}
            disabled={isGenerating}
            autoFocus
          />

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          {result !== null && (
            <div className="max-h-64 overflow-y-auto rounded-md border bg-muted/40 p-3 text-sm whitespace-pre-wrap">
              {result || <span className="text-muted-foreground">(réponse vide)</span>}
            </div>
          )}

          <DialogFooter>
            {result === null ? (
              <Button type="button" onClick={handleGenerate} disabled={isGenerating || !instruction.trim()}>
                {isGenerating && <Loader2 className="h-4 w-4 animate-spin" />}
                {isGenerating ? "Génération..." : "Générer"}
              </Button>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={handleGenerate} disabled={isGenerating}>
                  {isGenerating ? "Génération..." : "Régénérer"}
                </Button>
                <Button type="button" onClick={handleInsert}>
                  {value.trim().length > 0 ? "Remplacer" : "Insérer"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remplacer le contenu existant ?</AlertDialogTitle>
            <AlertDialogDescription>
              Ce champ contient déjà du texte. Le résultat généré le remplacera entièrement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={applyResult}>Remplacer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
