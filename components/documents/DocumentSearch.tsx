"use client"

import { useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { FileText, Loader2, Search } from "lucide-react"
import { Input } from "@/components/ui/input"

interface FolderPathEntry {
  id: string
  name: string
}

interface SearchResult {
  id: string
  name: string
  folderId: string | null
  folderPath: FolderPathEntry[]
}

interface DocumentSearchProps {
  /** Vue normale (arborescence + documents du dossier courant), affichée quand la recherche est vide. */
  children: ReactNode
}

const DEBOUNCE_MS = 250

/** Barre de recherche par nom (ITEM-034) — remplace la vue normale par les résultats tant qu'une requête est saisie. */
export function DocumentSearch({ children }: DocumentSearchProps) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trimmedQuery = query.trim()

  // Un seul effet, débouncé en interne (`setTimeout`) : toutes les mises à
  // jour d'état ont lieu dans des callbacks asynchrones (le timer, puis la
  // réponse `fetch`), jamais synchrones dans le corps de l'effet — pas de
  // deuxième effet "chaîné" sur un état dérivé (cf. `react-hooks/set-state-in-effect`).
  useEffect(() => {
    if (!trimmedQuery) return

    let cancelled = false
    const handle = setTimeout(() => {
      setLoading(true)
      setError(null)

      fetch(`/api/documents/search?q=${encodeURIComponent(trimmedQuery)}`)
        .then(async (response) => {
          const data = await response.json().catch(() => ({}))
          if (cancelled) return
          if (!response.ok) {
            setError(data.error ?? "Échec de la recherche.")
            return
          }
          setResults(data.results ?? [])
        })
        .catch(() => {
          if (!cancelled) setError("Échec de la recherche.")
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [trimmedQuery])

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher un document par nom..."
          className="pl-8"
          aria-label="Rechercher un document"
        />
      </div>

      {trimmedQuery ? (
        <div className="space-y-2">
          {loading && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          {!loading && !error && results.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucun document ne correspond à « {trimmedQuery} ».</p>
          )}

          {!loading && !error && results.length > 0 && (
            <ul className="divide-y rounded-lg border">
              {results.map((result) => (
                <li key={result.id}>
                  <button
                    type="button"
                    onClick={() => router.push(result.folderId ? `/documents/${result.folderId}` : "/documents")}
                    className="flex w-full items-center gap-3 p-3 text-left text-sm hover:bg-muted"
                  >
                    <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{result.name}</p>
                      <p className="truncate text-muted-foreground">
                        {result.folderPath.length > 0
                          ? `Documents / ${result.folderPath.map((folder) => folder.name).join(" / ")}`
                          : "Documents (racine)"}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        children
      )}
    </div>
  )
}
