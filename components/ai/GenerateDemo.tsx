"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { GenerateButton } from "./GenerateButton"

/**
 * Champ texte de démonstration du point d'entrée générique « Générer avec
 * l'IA » (ITEM-041) — `GenerateButton` est un composant contrôlé réutilisable
 * sur n'importe quel champ (`value`/`onChange`), pas seulement celui-ci.
 */
export function GenerateDemo() {
  const [content, setContent] = useState("")

  return (
    <Card>
      <CardHeader>
        <CardTitle>Champ texte</CardTitle>
        <CardDescription>
          Rédigez directement, ou générez un brouillon avec l&apos;IA à partir d&apos;une instruction.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Votre texte..."
          rows={8}
        />
        <div>
          <GenerateButton
            value={content}
            onChange={setContent}
            instructionPlaceholder="Ex. Rédige une description accueillante pour cette organisation."
          />
        </div>
      </CardContent>
    </Card>
  )
}
