/**
 * Shared dev-bypass check, used by both proxy.ts (edge) and server-side API
 * route guards (Node). Blocked in a production build unless
 * ALLOW_PRODUCTION_DEV_BYPASS is also set, so it can't be left on by
 * accident in a real deployment.
 */
export const DEV_BYPASS_USER = {
  uid: "dev-user",
  email: "developer@avrrio.local",
  role: "owner" as const,
};

export function isDevBypassActive(): boolean {
  const requested = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true";
  const isProductionBuild = process.env.NODE_ENV === "production";
  const allowedInProd = process.env.ALLOW_PRODUCTION_DEV_BYPASS === "true";
  return requested && (!isProductionBuild || allowedInProd);
}
