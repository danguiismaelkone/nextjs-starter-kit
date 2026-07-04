import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
});

/**
 * Read the current session on the server (Server Components, Route Handlers,
 * Server Actions). Returns `null` when there is no active session.
 */
export async function getSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}
