import { randomBytes } from "node:crypto";

/** Invitation lifetime, in milliseconds (7 days). */
export const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Persisted invitation statuses. `expired` is derived from `expiresAt`. */
export type InvitationStatus = "pending" | "accepted" | "revoked";

/** Generates a URL-safe, unguessable invitation token. */
export function generateInvitationToken(): string {
  return randomBytes(32).toString("hex");
}

/** Expiry timestamp for a freshly created/resent invitation. */
export function invitationExpiry(from: Date = new Date()): Date {
  return new Date(from.getTime() + INVITATION_TTL_MS);
}

/**
 * Builds the acceptance URL for an invitation token. Uses the server base URL
 * (`BETTER_AUTH_URL`), falling back to the public one.
 */
export function buildInvitationUrl(token: string): string {
  const base =
    process.env.BETTER_AUTH_URL ??
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ??
    "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/invite/accept?token=${token}`;
}

/** Why an invitation cannot be accepted (for a clear end-user message). */
export type InvitationInvalidReason = "not_found" | "revoked" | "accepted" | "expired";

/** Shape needed to evaluate whether an invitation is still acceptable. */
type InvitationLike = {
  status: string;
  expiresAt: Date;
};

/**
 * Returns `null` when the invitation can be accepted, otherwise the reason it
 * cannot. Centralised so the accept page and the accept action agree.
 */
export function invitationInvalidReason(
  invitation: InvitationLike | null | undefined,
): InvitationInvalidReason | null {
  if (!invitation) return "not_found";
  if (invitation.status === "revoked") return "revoked";
  if (invitation.status === "accepted") return "accepted";
  if (invitation.expiresAt.getTime() <= Date.now()) return "expired";
  return null;
}
