import { AdminNotConfiguredError, verifyIdToken } from "@/lib/firebase/admin";
import { resolveRole, type AccessRole } from "@/lib/auth/access";
import { DEV_BYPASS_USER, isDevBypassActive } from "@/lib/auth/devBypass";
import { GUEST_USER, isGuestModeActive } from "@/lib/auth/guestMode";

export class UnauthorizedError extends Error {}
export class ForbiddenError extends Error {}

export interface AuthedUser {
  uid: string;
  email: string;
  role: AccessRole;
}

function extractIdToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

/**
 * Verifies the caller's Firebase ID token and enforces beta approval for
 * server routes that perform AI generation or other gated actions.
 */
export async function requireAuthedUser(request: Request): Promise<AuthedUser> {
  if (isGuestModeActive()) {
    return { uid: GUEST_USER.uid, email: GUEST_USER.email, role: GUEST_USER.role };
  }
  if (isDevBypassActive()) {
    return { uid: DEV_BYPASS_USER.uid, email: DEV_BYPASS_USER.email, role: DEV_BYPASS_USER.role };
  }

  const idToken = extractIdToken(request);
  if (!idToken) {
    throw new UnauthorizedError("Missing authentication token.");
  }

  let decoded;
  try {
    decoded = await verifyIdToken(idToken);
  } catch (error) {
    if (error instanceof AdminNotConfiguredError) throw error;
    throw new UnauthorizedError("Invalid or expired authentication token.");
  }

  const email = decoded.email;
  if (!email) {
    throw new ForbiddenError("Account has no email on file.");
  }

  const role = resolveRole(email);
  if (!role) {
    throw new ForbiddenError("This beta is currently invite-only.");
  }

  return { uid: decoded.uid, email, role };
}
