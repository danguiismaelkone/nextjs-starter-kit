import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";

/** Password reset token lifetime, in seconds (1 hour). */
const RESET_PASSWORD_TOKEN_TTL = 60 * 60;

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  user: {
    additionalFields: {
      // Exposes the application role in the session (server & client).
      // `input: false` prevents a user from assigning their own role at
      // sign-up; promotion happens out-of-band (see scripts/promote-admin.ts).
      role: {
        type: "string",
        defaultValue: "user",
        input: false,
      },
      // Reversible account disable (ITEM-007). Exposed in the session so
      // getCurrentUser() can lock out a disabled account; `input: false`
      // keeps it out of user-facing sign-up/update payloads.
      disabledAt: {
        type: "date",
        required: false,
        input: false,
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    resetPasswordTokenExpiresIn: RESET_PASSWORD_TOKEN_TTL,
    // Sends the tokenized reset link via the Resend service (ITEM-005).
    // `url` already points to the callback that redirects to /reset-password.
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({
        to: user.email,
        url,
        userName: user.name,
      });
    },
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
