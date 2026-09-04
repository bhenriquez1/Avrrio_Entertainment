"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/firebase/AuthProvider";
import { listCanon } from "@/lib/production/repository";
import type { CanonRecord } from "@/types/canon";
import Link from "next/link";

const CATEGORY_SECTIONS = [
  { label: "Characters", types: ["character"] as const, icon: "◎" },
  { label: "Relationships", types: ["relationship"] as const, icon: "↔" },
  { label: "Locations", types: ["location"] as const, icon: "◈" },
  { label: "Powers & Rules", types: ["rule", "magic_system"] as const, icon: "⬡" },
  { label: "Timeline", types: ["historical_event"] as const, icon: "◷" },
  { label: "World Details", types: ["world_detail", "organization", "artifact", "species"] as const, icon: "◻" },
];

export default function StoryBiblePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: productionId } = use(params);
  const { uid, status } = useAuth();
  const [canon, setCanon] = useState<CanonRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (status !== "allowed") return;
    const all = await listCanon(uid, productionId);
    setCanon(all.filter((r) => r.status === "approved"));
    setLoading(false);
  }, [uid, productionId, status]);

  useEffect(() => { void load(); }, [load]);

  return (
    <main className="p-8 max-w-3xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Story Development</p>
          <h1 className="mt-1 text-xl font-bold text-zinc-50">Story Bible</h1>
          <p className="mt-1 text-sm text-zinc-400">Approved canon organized by category.</p>
        </div>
        <Link
          href={`/production/${productionId}/story-bible/import`}
          className="rounded-lg bg-amber-300 px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-amber-200 transition-colors"
        >
          Import Document
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : canon.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-10 text-center">
          <p className="text-sm text-zinc-400">No approved canon yet.</p>
          <p className="mt-2 text-xs text-zinc-600">
            Import story documents or use the{" "}
            <Link href={`/production/${productionId}/creative-room`} className="text-zinc-400 underline hover:text-zinc-200">Creative Room</Link>{" "}
            to develop ideas, then approve them in{" "}
            <Link href={`/production/${productionId}/canon`} className="text-zinc-400 underline hover:text-zinc-200">Canon → Pending</Link>.
          </p>
          <Link
            href={`/production/${productionId}/story-bible/import`}
            className="mt-5 inline-block rounded-lg bg-amber-300 px-5 py-2 text-sm font-bold text-zinc-950 hover:bg-amber-200 transition-colors"
          >
            Import your first document
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {CATEGORY_SECTIONS.map((section) => {
            const records = canon.filter((r) => (section.types as readonly string[]).includes(r.type));
            if (records.length === 0) return null;
            return (
              <div key={section.label}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-zinc-500">{section.icon}</span>
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">{section.label}</h2>
                  <span className="text-xs text-zinc-600">({records.length})</span>
                </div>
                <div className="space-y-2">
                  {records.map((record) => (
                    <div key={record.id} className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
                      <p className="text-sm font-semibold text-zinc-100">{record.title}</p>
                      <p className="mt-0.5 text-sm text-zinc-400 leading-5">{record.statement}</p>
                      {record.reviewNote && (
                        <p className="mt-1 text-xs text-zinc-600 italic">{record.reviewNote}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          <div className="pt-4 border-t border-zinc-800 flex gap-3">
            <Link
              href={`/production/${productionId}/story-bible/import`}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              Import another document
            </Link>
            <Link
              href={`/production/${productionId}/canon`}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              Review pending canon
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
