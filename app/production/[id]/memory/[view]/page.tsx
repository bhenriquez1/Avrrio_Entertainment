"use client";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/firebase/AuthProvider";
import { listCanon } from "@/lib/production/repository";
import type { CanonRecord } from "@/types/canon";

const CONFIG: Record<string, { title: string; description: string; types?: string[]; status?: string }> = {
  relationships: { title: "Relationships", description: "Family, alliances, rivalries, loyalties, and changing emotional bonds.", types: ["relationship"] },
  "powers-rules": { title: "Powers & Rules", description: "The laws, limits, costs, and consequences governing abilities and magic.", types: ["magic_system", "rule"] },
  secrets: { title: "Secrets", description: "Protected knowledge, reveals, and who knows what at each story point." },
  foreshadowing: { title: "Foreshadowing", description: "Planted clues, visions, promises, and planned narrative payoffs." },
  ideas: { title: "Ideas", description: "Creative possibilities saved for consideration. Nothing here is canon.", status: "proposed" },
};
const STATUS_STYLE: Record<string, string> = { approved: "border-emerald-400/20 bg-emerald-400/5 text-emerald-300", proposed: "border-amber-300/20 bg-amber-300/5 text-amber-200", rejected: "border-red-400/20 bg-red-400/5 text-red-300", superseded: "border-slate-500/20 bg-slate-500/5 text-slate-400" };

export default function StoryMemoryView({ params }: { params: Promise<{ id: string; view: string }> }) {
  const { id, view } = use(params); const { uid, status } = useAuth(); const [records, setRecords] = useState<CanonRecord[]>([]);
  const config = CONFIG[view] ?? { title: "Story Memory", description: "Structured knowledge shared across Avrrio's creative systems." };
  const load = useCallback(async () => { if (status === "allowed") setRecords(await listCanon(uid, id)); }, [id, status, uid]);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);
  const filtered = useMemo(() => records.filter((record) => { if (config.types && !config.types.includes(record.type)) return false; if (config.status && record.status !== config.status) return false; if (view === "secrets") return /secret|hidden|reveal|knows/i.test(`${record.title} ${record.statement}`); if (view === "foreshadowing") return /foreshadow|vision|prophecy|clue|omen|promise/i.test(`${record.title} ${record.statement}`); return true; }), [config.status, config.types, records, view]);
  return <main className="min-h-full bg-[radial-gradient(circle_at_top_right,rgba(30,64,175,.12),transparent_35%)] p-8"><div className="mx-auto max-w-5xl">
    <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-amber-300/75">Avrrio Story Memory</p><div className="mt-2 flex items-end justify-between gap-4"><div><h1 className="text-2xl font-semibold text-white">{config.title}</h1><p className="mt-2 max-w-2xl text-sm text-slate-400">{config.description}</p></div><span className="text-xs text-blue-200/35">{filtered.length} records</span></div>
    <div className="mt-8 grid gap-3 md:grid-cols-2">{filtered.map((record) => <article key={record.id} className="rounded-xl border border-blue-200/10 bg-white/[0.025] p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-[9px] uppercase tracking-[0.2em] text-blue-200/35">{record.type.replaceAll("_", " ")}</p><h2 className="mt-1 text-sm font-semibold text-slate-100">{record.title}</h2></div><span className={`rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${STATUS_STYLE[record.status]}`}>{record.status === "approved" ? "Canon" : record.status}</span></div><p className="mt-3 text-sm leading-6 text-slate-400">{record.statement}</p><p className="mt-4 text-[10px] text-slate-600">Source: {record.source}</p></article>)}{filtered.length === 0 && <div className="col-span-full rounded-2xl border border-dashed border-blue-200/10 px-6 py-14 text-center"><p className="text-sm text-slate-400">No {config.title.toLowerCase()} saved yet.</p><p className="mt-2 text-xs text-slate-600">Use Creative Room to save an idea or promote an approved decision to canon.</p></div>}</div>
  </div></main>;
}
