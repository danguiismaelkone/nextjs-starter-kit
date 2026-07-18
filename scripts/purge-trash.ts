// Purge définitivement les éléments de la corbeille (dossiers/documents en
// `deletedAt`) plus vieux que la rétention configurée — job planifié (cron
// externe, ex. `pnpm trash:purge` dans une tâche planifiée du déploiement) ou
// manuel (ITEM-032 : pas d'infrastructure de cron dans ce repo à ce stade).
// Usage : pnpm trash:purge [jours de rétention, défaut TRASH_RETENTION_DAYS]
import "dotenv/config"
import { prisma } from "../lib/prisma"
import { purgeExpiredTrash, TRASH_RETENTION_DAYS } from "../lib/documents"

async function main() {
  const days = Number(process.argv[2]) || TRASH_RETENTION_DAYS
  const { purgedFolders, purgedDocuments } = await purgeExpiredTrash(days)
  console.log(`Corbeille purgée (rétention ${days} j) : ${purgedFolders} dossier(s), ${purgedDocuments} document(s).`)
}

main()
  .catch((err) => {
    console.error("[trash:purge] Échec :", err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
