"use server";

import { revalidatePath } from "next/cache";
import { APIError } from "better-auth/api";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  AuthorizationError,
  requireAdminOrThrow,
  type Role,
} from "@/lib/authorization";
import { validateUserInput, type UserFormErrors } from "@/lib/user-validation";

/** Discriminated result returned to the client forms. */
export type ActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: UserFormErrors };

/** Wraps the admin guard so actions surface a clean message instead of throwing. */
function forbidden(error: unknown): ActionResult | null {
  if (error instanceof AuthorizationError) {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }
  return null;
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  role: Role;
}): Promise<ActionResult> {
  try {
    await requireAdminOrThrow();
  } catch (error) {
    return forbidden(error) ?? { ok: false, error: "Action non autorisée." };
  }

  const fieldErrors = validateUserInput(input, { requireCredentials: true });
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: "Veuillez corriger les champs indiqués.", fieldErrors };
  }

  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();

  let createdUserId: string;
  try {
    // Goes through Better Auth so the password is hashed and the credential
    // account is created exactly like a normal sign-up.
    const result = await auth.api.signUpEmail({
      body: { name, email, password: input.password },
    });
    createdUserId = result.user.id;
  } catch (error) {
    if (error instanceof APIError) {
      return { ok: false, error: "Un compte existe déjà avec cet e-mail.", fieldErrors: { email: "E-mail déjà utilisé." } };
    }
    throw error;
  }

  // The admin, not the new user, is acting — drop the session sign-up created
  // and apply the chosen role (role is `input: false`, so set it out-of-band).
  await prisma.session.deleteMany({ where: { userId: createdUserId } });
  if (input.role === "admin") {
    await prisma.user.update({
      where: { id: createdUserId },
      data: { role: "admin" },
    });
  }

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function updateUser(
  id: string,
  input: { name: string; role: Role },
): Promise<ActionResult> {
  try {
    await requireAdminOrThrow();
  } catch (error) {
    return forbidden(error) ?? { ok: false, error: "Action non autorisée." };
  }

  const fieldErrors = validateUserInput(input);
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: "Veuillez corriger les champs indiqués.", fieldErrors };
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return { ok: false, error: "Utilisateur introuvable." };
  }

  await prisma.user.update({
    where: { id },
    data: { name: input.name.trim(), role: input.role },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${id}`);
  return { ok: true };
}

export async function setUserDisabled(
  id: string,
  disabled: boolean,
): Promise<ActionResult> {
  let admin;
  try {
    admin = await requireAdminOrThrow();
  } catch (error) {
    return forbidden(error) ?? { ok: false, error: "Action non autorisée." };
  }

  if (disabled && admin.id === id) {
    return { ok: false, error: "Vous ne pouvez pas désactiver votre propre compte." };
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return { ok: false, error: "Utilisateur introuvable." };
  }

  await prisma.user.update({
    where: { id },
    data: { disabledAt: disabled ? new Date() : null },
  });

  // Revoke active sessions so a disabled account is logged out immediately.
  if (disabled) {
    await prisma.session.deleteMany({ where: { userId: id } });
  }

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${id}`);
  return { ok: true };
}
