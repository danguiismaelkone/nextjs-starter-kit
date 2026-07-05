"use server";

import { APIError } from "better-auth/api";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MIN_PASSWORD_LENGTH } from "@/lib/user-validation";
import { invitationInvalidReason } from "@/lib/invitation";

export type AcceptResult =
  | { ok: true; email: string }
  | { ok: false; error: string };

const INVALID_MESSAGE: Record<string, string> = {
  not_found: "Cette invitation est introuvable.",
  revoked: "Cette invitation a été révoquée.",
  accepted: "Cette invitation a déjà été utilisée.",
  expired: "Cette invitation a expiré.",
};

/**
 * Public action: an anonymous invitee sets their name + password to accept an
 * invitation. The e-mail comes from the token (never from the client), so a
 * valid token cannot be redirected to a different address.
 */
export async function acceptInvitation(input: {
  token: string;
  name: string;
  password: string;
}): Promise<AcceptResult> {
  const invitation = await prisma.invitation.findUnique({
    where: { token: input.token },
  });

  const reason = invitationInvalidReason(invitation);
  if (reason || !invitation) {
    return {
      ok: false,
      error: INVALID_MESSAGE[reason ?? "not_found"] ?? "Invitation invalide.",
    };
  }

  const name = input.name.trim();
  if (!name) {
    return { ok: false, error: "Le nom est requis." };
  }
  if (!input.password || input.password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      error: `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`,
    };
  }

  let createdUserId: string;
  try {
    const result = await auth.api.signUpEmail({
      body: { name, email: invitation.email, password: input.password },
    });
    createdUserId = result.user.id;
  } catch (error) {
    if (error instanceof APIError) {
      return { ok: false, error: "Un compte existe déjà avec cet e-mail." };
    }
    throw error;
  }

  // Apply the invited role and mark the invitation consumed. The conditional
  // update guards against a double-accept race.
  await prisma.$transaction([
    prisma.user.update({
      where: { id: createdUserId },
      data: { role: invitation.role },
    }),
    prisma.invitation.updateMany({
      where: { id: invitation.id, status: "pending" },
      data: { status: "accepted", acceptedAt: new Date() },
    }),
  ]);

  // Drop the session sign-up created; the invitee signs in from the client so
  // the auth cookie is set on their browser.
  await prisma.session.deleteMany({ where: { userId: createdUserId } });

  return { ok: true, email: invitation.email };
}
