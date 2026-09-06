"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/firebase/AuthProvider";
import { listCanon } from "@/lib/production/repository";
import type { CanonRecord } from "@/types/canon";
import Link from "next/link";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "characters", label: "Characters" },
  { id: "relationships", label: "Relationships" },
  { id: "world", label: "World" },
  { id: "timeline", label: "Timeline" },
  { id: "powers", label: "Powers" },
  { id: "secrets", label: "Secrets" },
  { id: "foreshadowing", label: "Foreshadowing" },
] as const;

type TabId = typeof TABS[number]["id"];

const TAB_TYPES: Record<TabId, string[]> = {
  overview: [],
  characters: ["character"],
  relationships: ["relationship"],
  world: ["location", "world_detail", "organization", "artifact", "species"],
  timeline: ["historical_event"],
  powers: ["rule", "magic_system"],
  secrets: ["secret"],
  foreshadowing: ["foreshadowing"],
};

export default function StoryBiblePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: productionId } = use(params);
  const { uid, status } = useAuth();
  const [canon, setCanon] = useState<CanonRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>("overview");

  const load = useCallback(async () => {
    if (status !== "allowed") return;
    const all = await listCanon(uid, productionId);
    setCanon(all.filter((r) => r.status === "approved"));
    setLoading(false);
  }, [uid, productionId, status]);

  useEffect(() => { void load(); }, [load]);

  const tabRecords = (tabId: TabId): CanonRecord[] => {
    const types = TAB_TYPES[tabId];
    if (types.length === 0) return canon;
    return canon.filter((r) => types.includes(r.type));
  };

  const tabCount = (tabId: TabId) => {
    if (tabId === "overview") return canon.length;
    return tabRecords(tabId).length;
  };

  return (
    <main className="flex h-full min-h-0 flex-col">
      <div className="border-b border-zinc-800 px-6 pt-6 pb-0">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Story Development</p>
            <h1 className="mt-1 text-xl font-bold text-zinc-50">Story Bible</h1>
          </div>
          <Link
            href={`/production/${productionId}/story-bible/import`}
            className="rounded-lg bg-amber-300 px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-amber-200 transition-colors"
          >
            Import Document
          </Link>
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((t) => {
            const count = tabCount(t.id);
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-shrink-0 rounded-t-md border-b-2 px-4 py-2 text-xs font-medium transition-colors ${
                  tab === t.id
                    ? "border-amber-400 text-amber-200"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {t.label}
                {count > 0 && (
                  <span className={`ml-1.5 text-[10px] ${tab === t.id ? "text-amber-400/70" : "text-zinc-600"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {loading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : tab === "overview" ? (
          <OverviewTab canon={canon} productionId={productionId} />
        ) : (
          <RecordList records={tabRecords(tab)} productionId={productionId} emptyLabel={TABS.find((t) => t.id === tab)?.label ?? ""} />
        )}
      </div>
    </main>
  );
}

function OverviewTab({ canon, productionId }: { canon: CanonRecord[]; productionId: string }) {
  const categories = TABS.filter((t) => t.id !== "overview");
  const filled = categories.filter((t) => {
    const types = TAB_TYPES[t.id];
    return canon.filter((r) => types.includes(r.type)).length > 0;
  });

  if (canon.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-800 p-10 text-center">
        <p className="text-sm text-zinc-400">No approved canon yet.</p>
        <p className="mt-2 text-xs text-zinc-600">
          Import story documents or use the{" "}
          <a href={`/production/${productionId}/creative-room`} className="text-zinc-400 underline hover:text-zinc-200">
            Creative Room
          </a>{" "}
          to develop ideas, then approve them in{" "}
          <a href={`/production/${productionId}/canon`} className="text-zinc-400 underline hover:text-zinc-200">
            Canon → Pending
          </a>.
        </p>
        <Link
          href={`/production/${productionId}/story-bible/import`}
          className="mt-5 inline-block rounded-lg bg-amber-300 px-5 py-2 text-sm font-bold text-zinc-950 hover:bg-amber-200 transition-colors"
        >
          Import your first document
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {categories.map((t) => {
          const count = canon.filter((r) => TAB_TYPES[t.id].includes(r.type)).length;
          return (
            <div key={t.id} className={`rounded-xl border px-4 py-3 ${count > 0 ? "border-zinc-700 bg-zinc-900" : "border-zinc-800 bg-zinc-900/40"}`}>
              <p className={`text-xs font-medium ${count > 0 ? "text-zinc-300" : "text-zinc-600"}`}>{t.label}</p>
              <p className={`text-2xl font-bold mt-1 ${count > 0 ? "text-amber-300" : "text-zinc-700"}`}>{count}</p>
            </div>
          );
        })}
      </div>
      {filled.slice(0, 3).map((t) => {
        const records = canon.filter((r) => TAB_TYPES[t.id].includes(r.type)).slice(0, 3);
        return (
          <div key={t.id}>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2">{t.label}</h3>
            <div className="space-y-1.5">
              {records.map((r) => (
                <div key={r.id} className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5">
                  <p className="text-xs font-semibold text-zinc-100">{r.title}</p>
                  <p className="mt-0.5 text-xs text-zinc-400 leading-5 line-clamp-2">{r.statement}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      <div className="flex gap-3 pt-2 border-t border-zinc-800">
        <Link
          href={`/production/${productionId}/story-bible/import`}
          className="rounded-lg border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors"
        >
          Import document
        </Link>
        <Link
          href={`/production/${productionId}/canon`}
          className="rounded-lg border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors"
        >
          Review pending canon
        </Link>
      </div>
    </div>
  );
}

function RecordList({ records, productionId, emptyLabel }: { records: CanonRecord[]; productionId: string; emptyLabel: string }) {
  if (records.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center">
        <p className="text-sm text-zinc-500">No {emptyLabel.toLowerCase()} in canon yet.</p>
        <p className="mt-2 text-xs text-zinc-600">
          Use the{" "}
          <a href={`/production/${productionId}/creative-room`} className="underline hover:text-zinc-400">Creative Room</a>{" "}
          or{" "}
          <a href={`/production/${productionId}/story-bible/import`} className="underline hover:text-zinc-400">Import a document</a>{" "}
          to add records.
        </p>
      </div>
    );
  }
  return (
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
  );
}
