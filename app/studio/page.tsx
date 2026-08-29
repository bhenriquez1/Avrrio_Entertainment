"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/firebase/AuthProvider";
import { listProductions, saveProduction } from "@/lib/production/repository";
import type { Production } from "@/types/production";

const STATUS_COLORS: Record<string, string> = {
  development: "text-amber-400",
  "pre-production": "text-sky-400",
  production: "text-emerald-400",
  "post-production": "text-purple-400",
  complete: "text-zinc-400",
};

export default function StudioPage() {
  const { uid, status } = useAuth();
  const [productions, setProductions] = useState<Production[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState("");
  const [logline, setLogline] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (status !== "allowed") return;
    setLoading(true);
    try {
      const list = await listProductions(uid);
      setProductions(list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    } finally {
      setLoading(false);
    }
  }, [uid, status]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const prod = await saveProduction(uid, {
        title: title.trim(),
        logline: logline.trim(),
        genre: [],
        status: "development",
        ownerId: uid,
        targetRuntimeMinutes: 25,
        targetSeasons: 1,
        targetEpisodesPerSeason: 10,
        canonVersion: "1.0",
      });
      setShowNew(false);
      setTitle("");
      setLogline("");
      setProductions((prev) => [prod, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create production");
    } finally {
      setCreating(false);
    }
  };

  return (
    <main className="flex-1 bg-zinc-950">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-50">Productions</h1>
            <p className="mt-1 text-sm text-zinc-400">Your active and archived production projects.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/studio/brand"
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              Studio Brand
            </Link>
            <button
              onClick={() => setShowNew(true)}
              className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-white transition-colors"
            >
              + New Production
            </button>
          </div>
        </div>

        {showNew && (
          <form onSubmit={handleCreate} className="mt-6 rounded-xl border border-zinc-700 bg-zinc-900 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-100">New Production</h2>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Title</label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Castillo"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Logline</label>
              <textarea
                value={logline}
                onChange={(e) => setLogline(e.target.value)}
                rows={2}
                placeholder="One-sentence story premise..."
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none resize-none"
              />
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating}
                className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-white disabled:opacity-50 transition-colors"
              >
                {creating ? "Creating…" : "Create Production"}
              </button>
              <button
                type="button"
                onClick={() => setShowNew(false)}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 space-y-3">
          {loading ? (
            <p className="text-sm text-zinc-500">Loading productions…</p>
          ) : productions.length === 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
              <p className="text-sm text-zinc-400">No productions yet. Create your first one above.</p>
            </div>
          ) : (
            productions.map((p) => (
              <Link
                key={p.id}
                href={`/production/${p.id}`}
                className="block rounded-xl border border-zinc-800 bg-zinc-900 p-5 hover:border-zinc-600 hover:bg-zinc-800 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold text-zinc-50">{p.title}</h2>
                    {p.logline && <p className="mt-1 text-sm text-zinc-400">{p.logline}</p>}
                  </div>
                  <span className={`text-xs font-semibold uppercase tracking-wider flex-shrink-0 ${STATUS_COLORS[p.status] ?? "text-zinc-400"}`}>
                    {p.status.replace(/-/g, " ")}
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-zinc-600">Canon v{p.canonVersion} · Updated {new Date(p.updatedAt).toLocaleDateString()}</p>
              </Link>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
