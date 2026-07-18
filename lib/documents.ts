import { prisma } from "@/lib/prisma"
import { deleteFile } from "@/lib/storage"
import { logger } from "@/lib/logger"

/** Délai de rétention de la corbeille avant purge définitive, configurable via `TRASH_RETENTION_DAYS` (défaut 30 jours). */
export const TRASH_RETENTION_DAYS = Number(process.env.TRASH_RETENTION_DAYS) || 30

export interface FolderPathEntry {
  id: string
  name: string
}

/** Dossier de l'organisation (non supprimé), ou `null` si inexistant/hors périmètre. */
export async function resolveFolder(organizationId: string, folderId: string) {
  return prisma.folder.findFirst({
    where: { id: folderId, organizationId, deletedAt: null },
  })
}

/** Fil d'ariane, de la racine (exclue) jusqu'au dossier courant (inclus). */
export async function getFolderPath(organizationId: string, folderId: string): Promise<FolderPathEntry[]> {
  const path: FolderPathEntry[] = []
  let currentId: string | null = folderId
  // Profondeur bornée en garde-fou : une arborescence normale ne boucle jamais
  // (la création/le déplacement de dossier interdit qu'un dossier devienne son
  // propre ancêtre, voir `wouldCreateCycle`).
  let guard = 0
  while (currentId && guard < 100) {
    const folder: { id: string; name: string; parentId: string | null } | null = await prisma.folder.findFirst({
      where: { id: currentId, organizationId },
      select: { id: true, name: true, parentId: true },
    })
    if (!folder) break
    path.unshift({ id: folder.id, name: folder.name })
    currentId = folder.parentId
    guard += 1
  }
  return path
}

/** Sous-dossiers et documents visibles (non supprimés) d'un dossier (ou de la racine si `null`). */
export async function listFolderContents(organizationId: string, folderId: string | null) {
  const [folders, documents] = await Promise.all([
    prisma.folder.findMany({
      where: { organizationId, parentId: folderId, deletedAt: null },
      orderBy: { name: "asc" },
    }),
    prisma.document.findMany({
      where: { organizationId, folderId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: { uploadedBy: { select: { name: true } } },
    }),
  ])
  return { folders, documents }
}

/** Vrai si déplacer `folderId` sous `newParentId` créerait un cycle (dans lui-même ou un de ses descendants). */
export async function wouldCreateCycle(
  organizationId: string,
  folderId: string,
  newParentId: string
): Promise<boolean> {
  if (newParentId === folderId) return true
  let currentId: string | null = newParentId
  let guard = 0
  while (currentId && guard < 100) {
    if (currentId === folderId) return true
    const folder: { parentId: string | null } | null = await prisma.folder.findFirst({
      where: { id: currentId, organizationId },
      select: { parentId: true },
    })
    if (!folder) return false
    currentId = folder.parentId
    guard += 1
  }
  return false
}

/**
 * Tous les descendants (récursif), quel que soit leur état `deletedAt` — utilisé
 * pour la cascade de suppression (descendants alors tous visibles) comme pour la
 * cascade de restauration (descendants alors tous en corbeille) : appliquer le
 * même `deletedAt` à tout le sous-arbre est sûr dans les deux sens.
 */
async function collectDescendantFolderIds(organizationId: string, folderId: string): Promise<string[]> {
  const children = await prisma.folder.findMany({
    where: { organizationId, parentId: folderId },
    select: { id: true },
  })
  const ids: string[] = []
  for (const child of children) {
    ids.push(child.id)
    ids.push(...(await collectDescendantFolderIds(organizationId, child.id)))
  }
  return ids
}

/**
 * Supprime (douce) un dossier et tout son contenu — sous-dossiers et documents,
 * récursivement. Fondation de la corbeille (ITEM-032, qui ajoutera la page de
 * restauration/purge) : les lignes restent en base, seulement marquées
 * `deletedAt`, jamais retirées du stockage S3 ici.
 */
export async function softDeleteFolderTree(organizationId: string, folderId: string): Promise<void> {
  const folderIds = [folderId, ...(await collectDescendantFolderIds(organizationId, folderId))]
  const now = new Date()
  await prisma.$transaction([
    prisma.folder.updateMany({ where: { id: { in: folderIds }, organizationId }, data: { deletedAt: now } }),
    prisma.document.updateMany({ where: { folderId: { in: folderIds }, organizationId }, data: { deletedAt: now } }),
  ])
}

/** Supprime (douce) un document isolé, hors suppression de son dossier parent. */
export async function softDeleteDocument(organizationId: string, documentId: string): Promise<void> {
  await prisma.document.updateMany({
    where: { id: documentId, organizationId, deletedAt: null },
    data: { deletedAt: new Date() },
  })
}

/**
 * Éléments en corbeille, limités au niveau le plus haut de chaque sous-arbre
 * supprimé (si un dossier et son contenu ont été supprimés ensemble, seul le
 * dossier apparaît — son contenu est implicite, restauré/purgé avec lui).
 */
export async function listTrash(organizationId: string) {
  const [allFolders, allDocuments] = await Promise.all([
    prisma.folder.findMany({ where: { organizationId, deletedAt: { not: null } } }),
    prisma.document.findMany({
      where: { organizationId, deletedAt: { not: null } },
      include: { uploadedBy: { select: { name: true } } },
    }),
  ])

  const deletedFolderIds = new Set(allFolders.map((folder) => folder.id))
  const folders = allFolders
    .filter((folder) => !folder.parentId || !deletedFolderIds.has(folder.parentId))
    .sort((a, b) => (b.deletedAt?.getTime() ?? 0) - (a.deletedAt?.getTime() ?? 0))
  const documents = allDocuments
    .filter((document) => !document.folderId || !deletedFolderIds.has(document.folderId))
    .sort((a, b) => (b.deletedAt?.getTime() ?? 0) - (a.deletedAt?.getTime() ?? 0))

  return { folders, documents }
}

/** Restaure `folderId` et tous ses ancêtres supprimés (pour qu'il redevienne atteignable depuis la racine). */
export async function restoreFolderChain(organizationId: string, folderId: string): Promise<void> {
  const idsToRestore: string[] = []
  let currentId: string | null = folderId
  let guard = 0
  while (currentId && guard < 100) {
    const folder: { id: string; parentId: string | null; deletedAt: Date | null } | null =
      await prisma.folder.findFirst({
        where: { id: currentId, organizationId },
        select: { id: true, parentId: true, deletedAt: true },
      })
    if (!folder) break
    if (folder.deletedAt) idsToRestore.push(folder.id)
    currentId = folder.parentId
    guard += 1
  }
  if (idsToRestore.length > 0) {
    await prisma.folder.updateMany({ where: { id: { in: idsToRestore }, organizationId }, data: { deletedAt: null } })
  }
}

/**
 * Restaure un dossier, tout son contenu (sous-dossiers, documents — même
 * logique de sous-arbre que `softDeleteFolderTree`) et ses ancêtres supprimés,
 * pour qu'il redevienne entièrement visible et atteignable.
 */
export async function restoreFolderTree(organizationId: string, folderId: string): Promise<void> {
  const folder = await prisma.folder.findFirst({ where: { id: folderId, organizationId } })
  if (!folder) return

  const folderIds = [folderId, ...(await collectDescendantFolderIds(organizationId, folderId))]
  await prisma.$transaction([
    prisma.folder.updateMany({ where: { id: { in: folderIds }, organizationId }, data: { deletedAt: null } }),
    prisma.document.updateMany({ where: { folderId: { in: folderIds }, organizationId }, data: { deletedAt: null } }),
  ])

  if (folder.parentId) await restoreFolderChain(organizationId, folder.parentId)
}

/** Restaure un document et le dossier (+ ancêtres) qui le contient s'il était lui aussi supprimé. */
export async function restoreDocument(organizationId: string, documentId: string): Promise<void> {
  const document = await prisma.document.findFirst({ where: { id: documentId, organizationId } })
  if (!document) return

  await prisma.document.update({ where: { id: document.id }, data: { deletedAt: null } })
  if (document.folderId) await restoreFolderChain(organizationId, document.folderId)
}

/** Supprime du bucket S3 chaque clé de stockage, en continuant même si l'une d'elles échoue. */
async function purgeStorageKeys(keys: Iterable<string>): Promise<void> {
  await Promise.all(
    Array.from(keys).map((key) =>
      deleteFile(key).catch((err) => {
        // Ne bloque jamais la purge DB pour un objet S3 introuvable/inaccessible :
        // mieux vaut un objet orphelin qu'une corbeille qui ne se vide plus.
        logger.warn("Échec de suppression d'un objet S3 lors d'une purge", { storageKey: key, error: err })
      })
    )
  )
}

/** Purge définitivement (DB + S3) un document en corbeille, avec tout son historique de versions. */
export async function purgeDocument(organizationId: string, documentId: string): Promise<void> {
  const document = await prisma.document.findFirst({
    where: { id: documentId, organizationId, deletedAt: { not: null } },
    include: { versions: true },
  })
  if (!document) return

  const keys = new Set([document.storageKey, ...document.versions.map((version) => version.storageKey)])
  await purgeStorageKeys(keys)
  // `DocumentVersion.document` est en `onDelete: Cascade` : les lignes de version
  // disparaissent avec le document, pas besoin de les supprimer séparément.
  await prisma.document.delete({ where: { id: document.id } })
}

/** Purge définitivement (DB + S3) un dossier en corbeille et tout son sous-arbre. */
export async function purgeFolder(organizationId: string, folderId: string): Promise<void> {
  const folder = await prisma.folder.findFirst({ where: { id: folderId, organizationId, deletedAt: { not: null } } })
  if (!folder) return

  const folderIds = [folderId, ...(await collectDescendantFolderIds(organizationId, folderId))]
  const documents = await prisma.document.findMany({
    where: { organizationId, folderId: { in: folderIds } },
    include: { versions: true },
  })

  const keys = new Set<string>()
  for (const document of documents) {
    keys.add(document.storageKey)
    for (const version of document.versions) keys.add(version.storageKey)
  }
  await purgeStorageKeys(keys)

  // `Folder.documents` est en `onDelete: SetNull` (un document survit à son
  // dossier, ITEM-028) : suppression explicite des documents avant celle des
  // dossiers, sinon ils seraient orphelinés à la racine au lieu d'être purgés.
  await prisma.document.deleteMany({ where: { id: { in: documents.map((document) => document.id) } } })
  await prisma.folder.deleteMany({ where: { id: { in: folderIds }, organizationId } })
}

/**
 * Purge tous les éléments en corbeille depuis plus de `retentionDays` — job
 * planifié ou manuel (`scripts/purge-trash.ts`, `pnpm trash:purge`), toutes
 * organisations confondues. Ne traite que le sommet de chaque sous-arbre
 * supprimé : `purgeFolder` purge déjà récursivement son contenu.
 */
export async function purgeExpiredTrash(retentionDays: number = TRASH_RETENTION_DAYS): Promise<{
  purgedFolders: number
  purgedDocuments: number
}> {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)

  const [expiredFolders, expiredDocuments] = await Promise.all([
    prisma.folder.findMany({ where: { deletedAt: { lt: cutoff } }, select: { id: true, organizationId: true, parentId: true } }),
    prisma.document.findMany({ where: { deletedAt: { lt: cutoff } }, select: { id: true, organizationId: true, folderId: true } }),
  ])

  const expiredFolderIds = new Set(expiredFolders.map((folder) => folder.id))
  const topLevelFolders = expiredFolders.filter((folder) => !folder.parentId || !expiredFolderIds.has(folder.parentId))
  const topLevelDocuments = expiredDocuments.filter(
    (document) => !document.folderId || !expiredFolderIds.has(document.folderId)
  )

  for (const folder of topLevelFolders) {
    await purgeFolder(folder.organizationId, folder.id)
  }
  for (const document of topLevelDocuments) {
    await purgeDocument(document.organizationId, document.id)
  }

  return { purgedFolders: topLevelFolders.length, purgedDocuments: topLevelDocuments.length }
}
