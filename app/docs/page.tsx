import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface EndpointDoc {
  method: string
  path: string
  summary: string
}

const endpoints: EndpointDoc[] = [
  { method: "GET", path: "/api/v1/users", summary: "Lister les membres de l'organisation (paginé)." },
  { method: "GET", path: "/api/v1/users/{id}", summary: "Récupérer un membre de l'organisation." },
  { method: "GET", path: "/api/v1/documents", summary: "Lister les documents de l'organisation (paginé)." },
  { method: "GET", path: "/api/v1/documents/{id}", summary: "Récupérer un document de l'organisation." },
]

/** Documentation publique de l'API v1 (ITEM-053) — page non authentifiée. */
export default function DocsPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-12">
      <div>
        <h1 className="text-2xl font-semibold">API publique v1</h1>
        <p className="mt-2 text-muted-foreground">
          API REST versionnée, scopée à votre organisation et authentifiée par clé API. Générez une clé
          depuis <code className="rounded bg-muted px-1 py-0.5">/settings/api-keys</code>, puis envoyez-la
          dans l&rsquo;en-tête <code className="rounded bg-muted px-1 py-0.5">Authorization</code>.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Authentification</CardTitle>
          <CardDescription>Chaque requête doit porter un en-tête Bearer avec une clé API active.</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-md bg-muted p-4 text-sm">
            <code>{`curl https://votre-domaine.example/api/v1/documents \\
  -H "Authorization: Bearer sk_votre_cle_api"`}</code>
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Format des réponses</CardTitle>
          <CardDescription>Enveloppe cohérente sur tous les endpoints.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div>
            <p className="mb-1 text-sm font-medium">Succès</p>
            <pre className="overflow-x-auto rounded-md bg-muted p-4 text-sm">
              <code>{`{ "data": [...], "meta": { "page": 1, "perPage": 20, "total": 42, "totalPages": 3 } }`}</code>
            </pre>
          </div>
          <div>
            <p className="mb-1 text-sm font-medium">Erreur</p>
            <pre className="overflow-x-auto rounded-md bg-muted p-4 text-sm">
              <code>{`{ "error": { "code": "unauthorized", "message": "Clé API invalide ou révoquée." } }`}</code>
            </pre>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Limite de débit</CardTitle>
          <CardDescription>Fenêtre glissante d&rsquo;une minute, par clé API — la limite dépend de votre plan.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Chaque réponse porte les en-têtes <code className="rounded bg-muted px-1 py-0.5">X-RateLimit-Limit</code>,{" "}
            <code className="rounded bg-muted px-1 py-0.5">X-RateLimit-Remaining</code> et{" "}
            <code className="rounded bg-muted px-1 py-0.5">X-RateLimit-Reset</code> (epoch secondes). Au-delà de la
            limite, l&rsquo;API répond <code className="rounded bg-muted px-1 py-0.5">429</code> avec un en-tête{" "}
            <code className="rounded bg-muted px-1 py-0.5">Retry-After</code>.
          </p>
          <pre className="overflow-x-auto rounded-md bg-muted p-4 text-sm">
            <code>{`HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1752700860
Retry-After: 42

{ "error": { "code": "rate_limited", "message": "Limite de 60 requêtes/minute dépassée. Réessayez dans 42s." } }`}</code>
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Endpoints</CardTitle>
          <CardDescription>
            Spécification complète (OpenAPI 3.0) :{" "}
            <a href="/api/v1/openapi.json" className="underline">
              /api/v1/openapi.json
            </a>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {endpoints.map((endpoint) => (
            <div key={endpoint.method + endpoint.path} className="flex items-center gap-3 text-sm">
              <Badge variant="secondary" className="font-mono">
                {endpoint.method}
              </Badge>
              <code className="font-mono">{endpoint.path}</code>
              <span className="text-muted-foreground">{endpoint.summary}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
