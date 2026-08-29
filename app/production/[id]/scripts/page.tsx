"use client";
import { use } from "react";
export default function ScriptsPage({ params }: { params: Promise<{ id: string }> }) {
  use(params);
  return (
    <main className="p-8">
      <h1 className="text-xl font-bold text-zinc-50 mb-2">Scripts</h1>
      <p className="text-sm text-zinc-500">Coming in v0.2 — Pre-Production.</p>
    </main>
  );
}
