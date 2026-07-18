import { redirect } from "next/navigation"
import { FileText } from "lucide-react"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { contentDisposition, getSignedUrl } from "@/lib/storage"
import { isShareActive, resolveShareByToken } from "@/lib/shares"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const PREVIEWABLE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]
const PREVIEWABLE_PDF_TYPE = "application/pdf"

function ShareMessage({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  const units = ["Ko", "Mo", "Go"]
  let value = bytes / 1024
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`
}

interface SharePageProps {
  params: Promise<{ token: string }>
}

/**
 * Page publique d'accès à un document partagé (ITEM-033) — hors des groupes
 * `(auth)`/`(protected)`, jamais de garde de session par défaut : le token
 * porte l'autorisation, sur le même principe que `app/invite/accept/page.tsx`.
 */
export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params
  const share = await resolveShareByToken(token)

  if (!share || share.document.deletedAt) {
    return <ShareMessage title="Lien invalide" description="Ce lien de partage n'existe pas ou plus." />
  }
  if (share.revokedAt) {
    return <ShareMessage title="Lien révoqué" description="Ce lien de partage a été révoqué par son propriétaire." />
  }
  if (!isShareActive(share)) {
    return <ShareMessage title="Lien expiré" description="Ce lien de partage a expiré." />
  }

  if (share.visibility === "restricted") {
    const session = await getSession()
    if (!session?.user) {
      redirect(`/login?callbackUrl=${encodeURIComponent(`/share/${token}`)}`)
    }
    const membership = await prisma.membership.findFirst({
      where: { userId: session.user.id, organizationId: share.document.organizationId, status: "active" },
    })
    if (!membership) {
      return (
        <ShareMessage
          title="Accès refusé"
          description="Ce lien est restreint aux membres de l'organisation propriétaire du document."
        />
      )
    }
  }

  const { document } = share
  const previewable =
    PREVIEWABLE_IMAGE_TYPES.includes(document.mimeType) || document.mimeType === PREVIEWABLE_PDF_TYPE

  const [previewUrl, downloadUrl] = await Promise.all([
    getSignedUrl(document.storageKey, { responseContentDisposition: contentDisposition("inline", document.name) }),
    getSignedUrl(document.storageKey, {
      responseContentDisposition: contentDisposition("attachment", document.name),
    }),
  ])

  return (
    <div className="flex min-h-screen flex-col items-center gap-6 p-6">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle className="truncate">{document.name}</CardTitle>
          <CardDescription>
            {formatSize(document.size)} · Lien en {share.accessLevel === "comment" ? "commentaire" : "lecture seule"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {share.accessLevel === "comment" && (
            <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              Les commentaires ne sont pas encore disponibles sur ce lien — accès en lecture seule pour le moment.
            </p>
          )}

          <div className="flex min-h-48 items-center justify-center">
            {previewable && document.mimeType === PREVIEWABLE_PDF_TYPE && (
              <iframe src={previewUrl} title={document.name} className="h-[70vh] w-full rounded-md border" />
            )}
            {previewable && PREVIEWABLE_IMAGE_TYPES.includes(document.mimeType) && (
              // eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire (S3), pas une ressource optimisable par next/image
              <img
                src={previewUrl}
                alt={document.name}
                className="mx-auto max-h-[70vh] w-auto rounded-md object-contain"
              />
            )}
            {!previewable && (
              <div className="flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
                <FileText className="h-12 w-12" />
                <p>Aperçu non disponible pour ce type de fichier.</p>
              </div>
            )}
          </div>

          <Button asChild>
            <a href={downloadUrl}>Télécharger</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
