"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/firebase/AuthProvider";
import { listCanon } from "@/lib/production/repository";
import type { CanonRecord } from "@/types/canon";

const WORLD_SECTIONS = [
  { label: "Locations", types: ["location"], icon: "◈" },
  { label: "Organizations", types: ["organization"], icon: "◻" },
  { label: "Artifacts", types: ["artifact"], icon: "◆" },
  { label: "Species", types: ["species"], icon: "◎" },
  { label: "World Details", types: ["world_detail"], icon: "·" },
] as const;

export default function WorldPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: productionId } = use(params);
  const { uid, status } = useAuth();
  const [canon, setCanon] = useState<CanonRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (status !== "allowed") return;
    const all = await listCanon(uid, productionId);
    const worldTypes = ["location", "organization", "artifact", "species", "world_detail"];
    setCanon(all.filter((r) => r.status === "approved" && worldTypes.includes(r.type)));
    setLoading(false);
  }, [uid, productionId, status]);

  useEffect(() => { void load(); }, [load]);

  const total = canon.length;

  return (
    <main className="p-8 max-w-3xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Story Development</p>
          <h1 className="mt-1 text-xl font-bold text-zinc-50">World</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Approved world-building — locations, organizations, artifacts, and lore.
          </p>
        </div>
        <Link
          href={`/production/${productionId}/story-bible/import`}
          className="rounded-lg border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors"
        >
          Import Document
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : total === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-10 text-center">
          <p className="text-sm text-zinc-400">No world-building canon yet.</p>
          <p className="mt-2 text-xs leading-5 text-zinc-600">
            Use the{" "}
            <Link href={`/production/${productionId}/creative-room`} className="underline hover:text-zinc-400">
              Creative Room
            </Link>{" "}
            to develop locations and lore, or{" "}
            <Link href={`/production/${productionId}/story-bible/import`} className="underline hover:text-zinc-400">
              import a document
            </Link>{" "}
            containing world details. Proposed records appear in{" "}
            <Link href={`/production/${productionId}/canon`} className="underline hover:text-zinc-400">
              Canon → Pending
            </Link>{" "}
            for your approval.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {WORLD_SECTIONS.map((section) => {
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
              href={`/production/${productionId}/creative-room`}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              Develop in Creative Room
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
