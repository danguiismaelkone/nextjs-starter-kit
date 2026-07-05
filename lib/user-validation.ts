import type { Role } from "@/lib/authorization";

/** Minimum length enforced for an initial password. Mirrors the sign-up form. */
export const MIN_PASSWORD_LENGTH = 8;

/** Selectable roles for the admin user forms. */
export const ROLES: readonly Role[] = ["user", "admin"] as const;

/** Loose e-mail shape check — mirrors the auth forms (server re-validates). */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Narrows an arbitrary string to a known {@link Role}. */
export function isValidRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export type UserFormErrors = {
  name?: string;
  email?: string;
  password?: string;
  role?: string;
};

type ValidateOptions = {
  /** Include e-mail + password checks (creation). Off for edit (name/role only). */
  requireCredentials?: boolean;
};

/**
 * Validates the admin user form fields. Shared by the client forms (instant
 * feedback) and the server actions (authoritative check) to avoid drift.
 */
export function validateUserInput(
  input: { name: string; email?: string; password?: string; role: string },
  { requireCredentials = false }: ValidateOptions = {},
): UserFormErrors {
  const errors: UserFormErrors = {};

  if (!input.name.trim()) {
    errors.name = "Le nom est requis.";
  }

  if (!isValidRole(input.role)) {
    errors.role = "Rôle invalide.";
  }

  if (requireCredentials) {
    const email = input.email ?? "";
    if (!email.trim()) {
      errors.email = "L'e-mail est requis.";
    } else if (!EMAIL_REGEX.test(email)) {
      errors.email = "Format d'e-mail invalide.";
    }

    const password = input.password ?? "";
    if (!password) {
      errors.password = "Le mot de passe est requis.";
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      errors.password = `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`;
    }
  }

  return errors;
}
