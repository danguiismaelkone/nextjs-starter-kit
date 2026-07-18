import Link from "next/link"
import { Box } from "lucide-react"

/**
 * Layout commun aux pages d'authentification (ITEM-072) — jusqu'ici
 * `login`/`register`/`forgot-password`/`reset-password`/`two-factor` ne
 * partageaient aucun layout et n'offraient aucun lien retour vers `/` (la
 * landing page). `{children}` garde son propre wrapper `flex-1
 * items-center justify-center` (chaque page), ce layout se contente
 * d'ajouter l'en-tête au-dessus dans une colonne `min-h-screen`.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="p-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Box className="size-4" />
          </span>
          SaaS Starter Kit
        </Link>
      </header>
      {children}
    </div>
  )
}
