import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { createRemoteJWKSet, jwtVerify } from "jose";

/**
 * Server-only Firebase Admin SDK. Used to verify ID tokens and write audit
 * logs that must not be tamperable from the client. Configure via a
 * service account: FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL,
 * FIREBASE_ADMIN_PRIVATE_KEY.
 */

const projectId =
  process.env.FIREBASE_ADMIN_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

export const isAdminConfigured = Boolean(projectId && clientEmail && privateKey);

let app: App | null = null;
if (isAdminConfigured) {
  app =
    getApps()[0] ??
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
}

export const adminAuth = app ? getAuth(app) : null;
export const adminDb = app ? getFirestore(app) : null;

const googleSigningKeys = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

export class AdminNotConfiguredError extends Error {
  constructor() {
    super(
      "Firebase Admin is not configured. Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY."
    );
  }
}

export async function verifyIdToken(idToken: string) {
  if (adminAuth) {
    return adminAuth.verifyIdToken(idToken);
  }

  if (!projectId) {
    throw new AdminNotConfiguredError();
  }

  // Token verification does not require a private service-account key.
  // Google publishes the Firebase signing keys, and jose verifies the
  // signature plus this project's exact issuer, audience, and expiry.
  const { payload } = await jwtVerify(idToken, googleSigningKeys, {
    algorithms: ["RS256"],
    audience: projectId,
    issuer: `https://securetoken.google.com/${projectId}`,
  });

  if (!payload.sub || typeof payload.sub !== "string") {
    throw new Error("Firebase token has no subject.");
  }

  return {
    ...payload,
    uid: payload.sub,
    email: typeof payload.email === "string" ? payload.email : undefined,
  };
}
