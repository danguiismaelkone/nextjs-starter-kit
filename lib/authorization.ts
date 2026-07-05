import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";

/** Application roles. Intentionally limited to two (ITEM-006). */
export type Role = "user" | "admin";

/**
 * Thrown by the `*OrThrow` guards when authorization fails. Route Handlers and
 * Server Actions can catch it to return a 401/403 instead of redirecting.
 */
export class AuthorizationError extends Error {
  constructor(
    message: string,
    /** Suggested HTTP status: 401 (unauthenticated) or 403 (forbidden). */
    readonly status: 401 | 403,
  ) {
    super(message);
    this.name = "AuthorizationError";
  }
}

/** The current user shape returned by Better Auth, narrowed with our fields. */
type SessionUser = NonNullable<
  Awaited<ReturnType<typeof getSession>>
>["user"] & { role?: string; disabledAt?: Date | string | null };

/**
 * Returns the current user (with `role`) or `null` when there is no session.
 * A disabled account (`disabledAt` set) is treated as unauthenticated, so it
 * is locked out of every guarded route even while it holds a valid session
 * cookie (ITEM-007). Does not redirect — use where anonymous is allowed.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getSession();
  const user = (session?.user as SessionUser | undefined) ?? null;
  if (user?.disabledAt) {
    return null;
  }
  return user;
}

/** True when the given user has the `admin` role. */
export function isAdmin(user: { role?: string } | null | undefined): boolean {
  return user?.role === "admin";
}

/**
 * Guard for authenticated pages: returns the current user or redirects to
 * `/login` when there is no active session.
 */
export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

/**
 * Guard for admin pages: returns the current user when they are an admin,
 * otherwise redirects (to `/login` when unauthenticated, `/dashboard` when
 * authenticated but not an admin). Use in Server Components / pages.
 */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!isAdmin(user)) {
    redirect("/dashboard");
  }
  return user;
}

/**
 * Guard for admin Route Handlers / Server Actions: returns the current user
 * when they are an admin, otherwise throws an {@link AuthorizationError}
 * (401 when unauthenticated, 403 when authenticated but not an admin).
 */
export async function requireAdminOrThrow(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthorizationError("Authentication required", 401);
  }
  if (!isAdmin(user)) {
    throw new AuthorizationError("Administrator access required", 403);
  }
  return user;
}
