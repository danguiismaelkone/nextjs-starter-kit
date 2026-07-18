// Promeut un utilisateur existant au rôle "admin".
// Usage : node --env-file=.env scripts/promote-admin.mjs user@example.com

import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const email = process.argv[2]
if (!email) {
  console.error("Usage: node --env-file=.env scripts/promote-admin.mjs <email>")
  process.exit(1)
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const user = await prisma.user.findUnique({ where: { email } })
if (!user) {
  console.error(`Aucun utilisateur trouvé avec l'e-mail ${email}`)
  await prisma.$disconnect()
  process.exit(1)
}

await prisma.user.update({ where: { email }, data: { role: "admin" } })
console.log(`${email} est maintenant admin.`)

await prisma.$disconnect()
