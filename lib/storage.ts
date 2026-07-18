import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"
import { getSignedUrl as presignUrl } from "@aws-sdk/s3-request-presigner"

const DEFAULT_SIGNED_URL_EXPIRES_IN = 300 // 5 minutes — jamais de bucket public par défaut.

let cachedClient: S3Client | undefined

/**
 * Client S3 paresseux, compatible tout fournisseur S3 (MinIO en local, R2/S3 en
 * production) via `S3_ENDPOINT` — même approche que `getStripeClient()`
 * (lib/stripe.ts) : construit au premier appel, pas au chargement du module.
 */
function getStorageClient(): S3Client {
  if (cachedClient) return cachedClient

  const region = process.env.S3_REGION || "auto"
  const endpoint = process.env.S3_ENDPOINT || undefined
  const accessKeyId = process.env.S3_ACCESS_KEY_ID
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "Stockage S3 non configuré : S3_ACCESS_KEY_ID et S3_SECRET_ACCESS_KEY sont requis."
    )
  }

  // `forcePathStyle` : requis par MinIO (pas de résolution de sous-domaine par
  // bucket) ; désactivé par défaut pour AWS S3/R2 sauf override explicite.
  const forcePathStyle = process.env.S3_FORCE_PATH_STYLE
    ? process.env.S3_FORCE_PATH_STYLE === "true"
    : !!endpoint

  cachedClient = new S3Client({
    region,
    endpoint,
    forcePathStyle,
    credentials: { accessKeyId, secretAccessKey },
  })
  return cachedClient
}

function getBucket(): string {
  const bucket = process.env.S3_BUCKET
  if (!bucket) throw new Error("Stockage S3 non configuré : S3_BUCKET est requis.")
  return bucket
}

export interface UploadFileInput {
  key: string
  body: Buffer | Uint8Array
  contentType: string
}

/** Dépose un fichier dans le bucket configuré. Ne retourne aucune URL publique. */
export async function uploadFile({ key, body, contentType }: UploadFileInput): Promise<{ key: string }> {
  await getStorageClient().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  )
  return { key }
}

export interface GetSignedUrlOptions {
  expiresIn?: number
  /**
   * En-tête `Content-Disposition` renvoyé par S3 avec le fichier — seul moyen
   * de forcer un nom de téléchargement lisible : la clé S3 est un UUID
   * (jamais le nom original, ITEM-028), donc sans ceci le navigateur
   * proposerait ce UUID comme nom de fichier.
   */
  responseContentDisposition?: string
}

/**
 * URL signée à expiration courte pour lire un fichier — jamais de bucket
 * public : c'est la seule façon dont un fichier doit être servi au client.
 */
export async function getSignedUrl(key: string, options: GetSignedUrlOptions = {}): Promise<string> {
  const { expiresIn = DEFAULT_SIGNED_URL_EXPIRES_IN, responseContentDisposition } = options
  const command = new GetObjectCommand({
    Bucket: getBucket(),
    Key: key,
    ResponseContentDisposition: responseContentDisposition,
  })
  return presignUrl(getStorageClient(), command, { expiresIn })
}

/** Supprime un fichier du bucket configuré. */
export async function deleteFile(key: string): Promise<void> {
  await getStorageClient().send(new DeleteObjectCommand({ Bucket: getBucket(), Key: key }))
}

/**
 * Contenu d'un fichier en mémoire (ITEM-042, OCR) — à réserver aux fichiers de
 * taille bornée en amont : contrairement à `getSignedUrl`, ceci charge tout
 * l'objet en mémoire côté serveur plutôt que de le streamer au client.
 */
export async function getFileBuffer(key: string): Promise<Buffer> {
  const response = await getStorageClient().send(new GetObjectCommand({ Bucket: getBucket(), Key: key }))
  if (!response.Body) throw new Error(`Objet S3 introuvable ou vide pour la clé "${key}".`)
  const bytes = await response.Body.transformToByteArray()
  return Buffer.from(bytes)
}

/**
 * Vérifie la connectivité au stockage S3-compatible (ITEM-063, `/api/health`) —
 * `HeadBucketCommand` confirme l'existence du bucket et la validité des
 * identifiants sans lire/écrire le moindre objet, contrairement à un
 * upload/download de test.
 */
export async function pingStorage(): Promise<void> {
  await getStorageClient().send(new HeadBucketCommand({ Bucket: getBucket() }))
}

/**
 * En-tête `Content-Disposition` sûr pour `getSignedUrl` — jamais le nom de
 * fichier tel quel dedans (injection de caractères de contrôle). `inline` pour
 * une prévisualisation (ITEM-030), `attachment` pour forcer le téléchargement
 * sous le nom original du document plutôt que sa clé S3 (un UUID).
 */
export function contentDisposition(type: "inline" | "attachment", filename: string): string {
  const fallback = filename.replace(/["\r\n]/g, "_")
  return `${type}; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`
}
