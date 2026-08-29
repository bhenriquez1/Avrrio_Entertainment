"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/lib/firebase/AuthProvider";
import { SignInForm } from "@/components/auth/SignInForm";

const INVITE_ONLY_MESSAGE = "This beta is currently invite-only.";

export function AuthGate({ children }: { children: ReactNode }) {
  const { status, email, signOutUser } = useAuth();

  if (status === "not_configured") {
    return (
      <main className="flex flex-1 items-center justify-center bg-zinc-50 px-6 dark:bg-black">
        <Card className="max-w-md text-center">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Setup Required
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Avrrio Entertainment requires Firebase Authentication to be configured before it can be
            accessed. No public or anonymous access is available. Set the{" "}
            <code>NEXT_PUBLIC_FIREBASE_*</code> environment variables to continue.
          </p>
        </Card>
      </main>
    );
  }

  if (status === "checking") {
    return (
      <main className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
      </main>
    );
  }

  if (status === "unauthenticated") {
    return (
      <main className="flex-1 bg-zinc-50 dark:bg-black">
        <SignInForm />
      </main>
    );
  }

  if (status === "pending_approval") {
    return (
      <main className="flex flex-1 items-center justify-center bg-zinc-50 px-6 dark:bg-black">
        <Card className="max-w-md text-center">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {INVITE_ONLY_MESSAGE}
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {email ? `${email} is not yet approved for beta access.` : "Your account is not yet approved."}{" "}
            Reach out to the Avrrio Entertainment team if you believe this is a mistake.
          </p>
          <Button variant="secondary" className="mt-4" onClick={() => signOutUser()}>
            Sign Out
          </Button>
        </Card>
      </main>
    );
  }

  return <>{children}</>;
}
