"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "./config";
import { DEV_BYPASS_USER } from "@/lib/auth/devBypass";
import { GUEST_USER, isGuestModeActive } from "@/lib/auth/guestMode";

/**
 * Client-side mirror of the bypass flag for UI purposes only (show the
 * dashboard + dev banner instead of "Setup Required"). NEXT_PUBLIC_* vars are
 * the only env vars visible in the browser bundle, so this can't see
 * ALLOW_PRODUCTION_DEV_BYPASS — the real enforcement (including the
 * production-safety gate) happens server-side in proxy.ts and
 * requireAuthedUser. If this flag is on but the server-side gate isn't,
 * protected pages/API calls will redirect/401 despite this optimistic UI.
 */
const devBypassAuth = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true";
const guestModeActive = isGuestModeActive();

export type AccessStatus =
  | "not_configured"
  | "checking"
  | "unauthenticated"
  | "pending_approval"
  | "allowed";

export type AccessRole = "owner" | "member" | null;

interface AuthContextValue {
  user: User | null;
  uid: string;
  email: string | null;
  status: AccessStatus;
  role: AccessRole;
  isDevBypass: boolean;
  getIdToken: () => Promise<string | null>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  uid: "",
  email: null,
  status: "not_configured",
  role: null,
  isDevBypass: false,
  getIdToken: async () => null,
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  signOutUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AccessStatus>(
    guestModeActive || devBypassAuth ? "allowed" : isFirebaseConfigured ? "checking" : "not_configured"
  );
  const [role, setRole] = useState<AccessRole>(
    guestModeActive ? GUEST_USER.role : devBypassAuth ? "owner" : null
  );

  useEffect(() => {
    if (guestModeActive || devBypassAuth || !isFirebaseConfigured || !auth) {
      return;
    }
    const activeAuth = auth;

    const unsubscribe = onAuthStateChanged(activeAuth, async (current) => {
      setUser(current);
      if (!current) {
        setRole(null);
        setStatus("unauthenticated");
        return;
      }

      setStatus("checking");
      try {
        const idToken = await current.getIdToken();
        const response = await fetch("/api/auth/access", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ idToken }),
        });
        const data = await response.json();
        if (response.ok && data.allowed) {
          setRole(data.role);
          setStatus("allowed");
        } else {
          setRole(null);
          setStatus("pending_approval");
        }
      } catch {
        setRole(null);
        setStatus("pending_approval");
      }
    });

    return () => unsubscribe();
  }, []);

  const getIdToken = useCallback(async () => {
    if (!user) return null;
    return user.getIdToken();
  }, [user]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    if (!auth) throw new Error("Authentication is not configured.");
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    if (!auth) throw new Error("Authentication is not configured.");
    await createUserWithEmailAndPassword(auth, email, password);
  }, []);

  const signOutUser = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // best-effort — the Firebase sign-out below still ends the client session
    }
    if (!auth) return;
    await firebaseSignOut(auth);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        uid: guestModeActive ? GUEST_USER.uid : devBypassAuth ? DEV_BYPASS_USER.uid : user?.uid ?? "",
        email: guestModeActive ? GUEST_USER.email : devBypassAuth ? DEV_BYPASS_USER.email : user?.email ?? null,
        status,
        role: guestModeActive ? GUEST_USER.role : devBypassAuth ? DEV_BYPASS_USER.role : role,
        isDevBypass: devBypassAuth,
        getIdToken,
        signInWithEmail,
        signUpWithEmail,
        signOutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
