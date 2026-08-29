"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { FieldGroup, Input } from "@/components/ui/Field";
import { useAuth } from "@/lib/firebase/AuthProvider";

export function SignInForm() {
  const { signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState<"sign_in" | "sign_up">("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "sign_in") {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to authenticate.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm py-24">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Avrrio Entertainment</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        {mode === "sign_in" ? "Sign in to continue." : "Create an account to request access."}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <FieldGroup label="Email">
          <Input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </FieldGroup>
        <FieldGroup label="Password">
          <Input
            type="password"
            required
            minLength={6}
            autoComplete={mode === "sign_in" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </FieldGroup>

        {error && <ErrorMessage message={error} />}

        <Button type="submit" loading={submitting} className="w-full">
          {mode === "sign_in" ? "Sign In" : "Create Account"}
        </Button>
      </form>

      <button
        type="button"
        onClick={() => setMode((m) => (m === "sign_in" ? "sign_up" : "sign_in"))}
        className="mt-4 text-sm text-zinc-500 hover:underline dark:text-zinc-400"
      >
        {mode === "sign_in" ? "Need an account? Create one" : "Already have an account? Sign in"}
      </button>
    </div>
  );
}
