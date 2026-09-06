"use client";

import { useEffect, useState, use } from "react";
import { useAuth } from "@/lib/firebase/AuthProvider";
import { getProduction, listCanon, listSeasons } from "@/lib/production/repository";
import type { Production } from "@/types/production";
import type { CanonRecord } from "@/types/canon";
import type { Season } from "@/types/episode";
import Link from "next/link";

const STATUS_LABELS: Record<string, string> = {
  development: "Development",
  "pre-production": "Pre-Production",
  production: "Production",
  "post-production": "Post-Production",
  complete: "Complete",
};

export default function ProductionOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { uid, status } = useAuth();
  const [production, setProduction] = useState<Production | null>(null);
  const [canon, setCanon] = useState<CanonRecord[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "allowed") return;
    (async () => {
      const [prod, canonList, seasonList] = await Promise.all([
        getProduction(uid, id),
        listCanon(uid, id),
        listSeasons(uid, id),
      ]);
      setProduction(prod);
      setCanon(canonList);
      setSeasons(seasonList);
      setLoading(false);
    })();
  }, [uid, id, status]);

  if (loading) {
    return <div className="p-8 text-sm text-zinc-500">Loading…</div>;
  }
  if (!production) {
    return <div className="p-8 text-sm text-zinc-500">Production not found.</div>;
  }

  const approvedCanon = canon.filter((c) => c.status === "approved");
  const pendingCanon = canon.filter((c) => c.status === "proposed");
  const contradictions = canon.filter((c) => c.contradictions.length > 0);
  const characters = canon.filter((c) => c.status === "approved" && c.type === "character");

  return (
    <main className="p-8 max-w-3xl">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Production #001</p>
          <h1 className="mt-1 text-2xl font-bold text-zinc-50">{production.title}</h1>
          {production.logline && <p className="mt-1 text-sm text-zinc-400">{production.logline}</p>}
        </div>
        <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          {STATUS_LABELS[production.status] ?? production.status}
        </span>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Canon", value: `${approvedCanon.length} approved`, sub: `${pendingCanon.length} pending` },
          { label: "Characters", value: `${characters.length} locked`, sub: "approved" },
          { label: "Season 1", value: seasons.length > 0 ? seasons[0].status.replace(/-/g, " ") : "Not started", sub: `${seasons.length} season(s)` },
          { label: "Canon v", value: production.canonVersion, sub: "current version" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{stat.label}</p>
            <p className="mt-1 text-base font-semibold text-zinc-100">{stat.value}</p>
            <p className="text-xs text-zinc-500">{stat.sub}</p>
          </div>
        ))}
      </div>

      {(contradictions.length > 0 || pendingCanon.length > 0) && (
        <div className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">Creative Review</h2>
          <div className="space-y-2">
            {contradictions.map((c) => (
              <div key={c.id} className="flex items-start gap-2 rounded-lg border border-amber-900/40 bg-amber-950/20 px-4 py-3">
                <span className="text-amber-400 text-sm">⚠</span>
                <div>
                  <p className="text-sm font-medium text-amber-300">{c.title}</p>
                  <p className="text-xs text-amber-500">{c.contradictions[0]}</p>
                </div>
              </div>
            ))}
            {pendingCanon.slice(0, 3).map((c) => (
              <div key={c.id} className="flex items-start gap-2 rounded-lg border border-zinc-800 px-4 py-3">
                <span className="text-zinc-500 text-sm">◦</span>
                <p className="text-sm text-zinc-400"><span className="text-zinc-300 font-medium">{c.title}</span> — awaiting approval</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-3">
            <Link href={`/production/${id}/canon`} className="rounded-lg border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors">
              Review Canon
            </Link>
            <Link href={`/production/${id}/story-bible`} className="rounded-lg bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-900 hover:bg-white transition-colors">
              Continue Development
            </Link>
          </div>
        </div>
      )}

      {contradictions.length === 0 && pendingCanon.length === 0 && approvedCanon.length === 0 && (
        <div className="mt-6">
          <div className="flex items-start gap-2 rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-3">
            <span className="text-zinc-500">○</span>
            <p className="text-sm text-zinc-400">Canon initialized — no approved story records yet.</p>
          </div>
          <div className="mt-4 flex gap-3">
            <Link href={`/production/${id}/canon`} className="rounded-lg border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors">
              Import Canon
            </Link>
            <Link href={`/production/${id}/story-bible`} className="rounded-lg bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-900 hover:bg-white transition-colors">
              Continue Development
            </Link>
          </div>
        </div>
      )}

      {contradictions.length === 0 && pendingCanon.length === 0 && approvedCanon.length > 0 && (
        <div className="mt-6">
          <div className="flex items-start gap-2 rounded-lg border border-emerald-900/40 bg-emerald-950/20 px-4 py-3">
            <span className="text-emerald-400">✓</span>
            <p className="text-sm text-emerald-300">Canon is consistent — no contradictions detected.</p>
          </div>
          <div className="mt-4">
            <Link href={`/production/${id}/story-bible`} className="rounded-lg bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-900 hover:bg-white transition-colors">
              Continue Development
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
