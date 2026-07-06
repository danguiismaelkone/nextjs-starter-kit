"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import {
  AuthorizationError,
  requireAdminOrThrow,
  type Role,
} from "@/lib/authorization";
import { EMAIL_REGEX, isValidRole } from "@/lib/user-validation";
import {
  buildInvitationUrl,
  generateInvitationToken,
  invitationExpiry,
} from "@/lib/invitation";
import { sendInvitationEmail } from "@/lib/email";

export type ActionResult = { ok: true } | { ok: false; error: string };

// Invitations now live under the Users page (Invitations tab, ITEM-015), so that
// is the route to revalidate after a mutation.
const INVITATIONS_PATH = "/admin/users";

function forbidden(error: unknown): ActionResult | null {
  if (error instanceof AuthorizationError) {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }
  return null;
}

export async function createInvitation(input: {
  email: string;
  role: Role;
}): Promise<ActionResult> {
  let admin;
  try {
    admin = await requireAdminOrThrow();
  } catch (error) {
    return forbidden(error) ?? { ok: false, error: "Action non autorisée." };
  }

  const email = input.email.trim().toLowerCase();
  if (!email || !EMAIL_REGEX.test(email)) {
    return { ok: false, error: "Format d'e-mail invalide." };
  }
  if (!isValidRole(input.role)) {
    return { ok: false, error: "Rôle invalide." };
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return { ok: false, error: "Un compte existe déjà avec cet e-mail." };
  }

  // Keep a single active invitation per e-mail: supersede any pending one.
  await prisma.invitation.updateMany({
    where: { email, status: "pending" },
    data: { status: "revoked" },
  });

  const token = generateInvitationToken();
  await prisma.invitation.create({
    data: {
      id: randomUUID(),
      email,
      role: input.role,
      token,
      status: "pending",
      expiresAt: invitationExpiry(),
      invitedBy: admin.id,
    },
  });

  await sendInvitationEmail({
    to: email,
    url: buildInvitationUrl(token),
    inviterName: admin.name ?? undefined,
  });

  revalidatePath(INVITATIONS_PATH);
  return { ok: true };
}

export async function revokeInvitation(id: string): Promise<ActionResult> {
  try {
    await requireAdminOrThrow();
  } catch (error) {
    return forbidden(error) ?? { ok: false, error: "Action non autorisée." };
  }

  const invitation = await prisma.invitation.findUnique({ where: { id } });
  if (!invitation) {
    return { ok: false, error: "Invitation introuvable." };
  }
  if (invitation.status !== "pending") {
    return { ok: false, error: "Seule une invitation en attente peut être révoquée." };
  }

  await prisma.invitation.update({
    where: { id },
    data: { status: "revoked" },
  });

  revalidatePath(INVITATIONS_PATH);
  return { ok: true };
}

export async function resendInvitation(id: string): Promise<ActionResult> {
  let admin;
  try {
    admin = await requireAdminOrThrow();
  } catch (error) {
    return forbidden(error) ?? { ok: false, error: "Action non autorisée." };
  }

  const invitation = await prisma.invitation.findUnique({ where: { id } });
  if (!invitation) {
    return { ok: false, error: "Invitation introuvable." };
  }
  if (invitation.status !== "pending") {
    return { ok: false, error: "Seule une invitation en attente peut être renvoyée." };
  }

  // Rotate the token and extend the expiry so the resent link is fresh.
  const token = generateInvitationToken();
  await prisma.invitation.update({
    where: { id },
    data: { token, expiresAt: invitationExpiry() },
  });

  await sendInvitationEmail({
    to: invitation.email,
    url: buildInvitationUrl(token),
    inviterName: admin.name ?? undefined,
  });

  revalidatePath(INVITATIONS_PATH);
  return { ok: true };
}
