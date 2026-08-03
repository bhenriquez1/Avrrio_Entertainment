import type { AccessRole } from "@/lib/auth/access";

export const GUEST_USER = {
  uid: "guest-user",
  email: "guest@purposepen.local",
  displayName: "Guest Tester",
  role: "member" as AccessRole,
};

export function isGuestModeActive(): boolean {
  return process.env.NEXT_PUBLIC_GUEST_MODE === "true";
}
