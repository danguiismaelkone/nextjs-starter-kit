/**
 * Promote a user to the `admin` role by email.
 *
 * Usage:
 *   pnpm promote-admin user@example.com
 *   ADMIN_EMAIL=user@example.com pnpm promote-admin
 *
 * This is the documented way to bootstrap the first administrator (ITEM-006):
 * sign the user up through the normal flow, then run this script once.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

async function main() {
  const email = process.argv[2] ?? process.env.ADMIN_EMAIL;
  if (!email) {
    console.error(
      "Missing email. Usage: pnpm promote-admin <email> (or set ADMIN_EMAIL).",
    );
    process.exit(1);
  }

  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  const prisma = new PrismaClient({ adapter });

  try {
    const user = await prisma.user.update({
      where: { email },
      data: { role: "admin" },
    });
    console.log(`✅ ${user.email} is now an admin.`);
  } catch {
    console.error(`❌ No user found with email "${email}".`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
