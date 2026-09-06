"use client";

import { use } from "react";
import Link from "next/link";

export default function StoryboardsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: productionId } = use(params);
  return (
    <main className="p-8 max-w-2xl">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Production</p>
      <h1 className="mt-1 text-xl font-bold text-zinc-50">Storyboards</h1>
      <p className="mt-1 text-sm text-zinc-400">Visual storyboard planning for scenes and sequences.</p>
      <div className="mt-8 rounded-xl border border-dashed border-zinc-800 p-10 text-center">
        <p className="text-sm text-zinc-500">Storyboards coming soon.</p>
        <p className="mt-2 text-xs text-zinc-600">
          Start in the{" "}
          <Link href={`/production/${productionId}/creative-room`} className="underline hover:text-zinc-400">
            Creative Room
          </Link>{" "}
          to develop scenes before storyboarding.
        </p>
      </div>
    </main>
  );
}
