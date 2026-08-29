"use client";

import Link from "next/link";
import { useAuth } from "@/lib/firebase/AuthProvider";

export function StudioHeader() {
  const { email, signOutUser } = useAuth();

  return (
    <header className="flex h-11 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-6">
      <Link href="/studio" className="text-sm font-bold tracking-widest text-zinc-100 uppercase">
        Avrrio Entertainment
      </Link>
      <div className="flex items-center gap-4">
        {email && <span className="text-xs text-zinc-500">{email}</span>}
        <button
          onClick={signOutUser}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
