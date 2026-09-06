"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/firebase/AuthProvider";
import { listCanon, listEpisodes, listScripts, listSeasons, saveScript } from "@/lib/production/repository";
import type { ProductionScript } from "@/types/production";
import type { Episode, Season } from "@/types/episode";

const STATUS_STYLE: Record<string, string> = {
  draft: "text-zinc-500",
  review: "text-amber-400",
  approved: "text-emerald-400",
};

const EMPTY_FORM = { title: "", storyContext: "", content: "", seasonId: "", episodeId: "" };

export default function ScriptsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: productionId } = use(params);
  const { uid, status } = useAuth();

  const [scripts, setScripts] = useState<ProductionScript[]>([]);
  const [canonIds, setCanonIds] = useState<string[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (status !== "allowed") return;
    const [savedScripts, canon, savedSeasons] = await Promise.all([
      listScripts(uid, productionId),
      listCanon(uid, productionId),
      listSeasons(uid, productionId),
    ]);
    setScripts(savedScripts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    setCanonIds(canon.filter((c) => c.status === "approved").map((c) => c.id));
    setSeasons(savedSeasons.sort((a, b) => a.number - b.number));
    setLoading(false);
  }, [uid, productionId, status]);

  useEffect(() => { void load(); }, [load]);

  async function loadEpisodes(seasonId: string) {
    if (!seasonId) { setEpisodes([]); return; }
    const eps = await listEpisodes(uid, productionId, seasonId);
    setEpisodes(eps.sort((a, b) => a.number - b.number));
  }

  function patch(key: keyof typeof EMPTY_FORM, value: string) {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === "seasonId") { next.episodeId = ""; void loadEpisodes(value); }
      return next;
    });
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);

    const season = seasons.find((s) => s.id === form.seasonId);
    const episode = episodes.find((ep) => ep.id === form.episodeId);
    const context = [
      season ? `Season ${season.number}: ${season.title}` : "",
      episode ? `Episode ${episode.number}: ${episode.title}` : "",
      form.storyContext,
    ].filter(Boolean).join(" · ");

    const saved = await saveScript(uid, productionId, {
      title: form.title.trim(),
      storyContext: context,
      content: form.content.trim(),
      status: "draft",
      linkedCanonIds: canonIds,
    });
    setScripts((s) => [saved, ...s]);
    setForm(EMPTY_FORM);
    setSaving(false);
    setShowForm(false);
  }

  async function advance(script: ProductionScript) {
    const next = script.status === "draft" ? "review" : "approved";
    const saved = await saveScript(uid, productionId, { ...script, status: next });
    setScripts((s) => s.map((item) => item.id === script.id ? saved : item));
  }

  if (loading) return <div className="p-8 text-sm text-zinc-500">Loading…</div>;

  return (
    <main className="p-8 max-w-4xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Story Department</p>
          <h1 className="mt-1 text-xl font-bold text-zinc-50">Scripts</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Write and approve scripts against {canonIds.length} locked canon facts.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-lg border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors"
        >
          + New Script
        </button>
      </div>

      {showForm && (
        <form onSubmit={create} className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-100">New Script</h2>
            <button type="button" onClick={() => setShowForm(false)} className="text-zinc-600 hover:text-zinc-400 text-sm">×</button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs text-zinc-500 sm:col-span-2">
              Script title
              <input
                value={form.title}
                onChange={(e) => patch("title", e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none"
                placeholder="e.g. Pilot — Full Script"
              />
            </label>

            {seasons.length > 0 && (
              <label className="block text-xs text-zinc-500">
                Season
                <select
                  value={form.seasonId}
                  onChange={(e) => patch("seasonId", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none"
                >
                  <option value="">— None —</option>
                  {seasons.map((s) => (
                    <option key={s.id} value={s.id}>Season {s.number}: {s.title}</option>
                  ))}
                </select>
              </label>
            )}

            {form.seasonId && episodes.length > 0 && (
              <label className="block text-xs text-zinc-500">
                Episode
                <select
                  value={form.episodeId}
                  onChange={(e) => patch("episodeId", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none"
                >
                  <option value="">— None —</option>
                  {episodes.map((ep) => (
                    <option key={ep.id} value={ep.id}>Ep {ep.number}: {ep.title}</option>
                  ))}
                </select>
              </label>
            )}

            <label className="block text-xs text-zinc-500 sm:col-span-2">
              Additional context (optional)
              <input
                value={form.storyContext}
                onChange={(e) => patch("storyContext", e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none"
                placeholder="Act II — cold open revision"
              />
            </label>
          </div>

          <label className="block text-xs text-zinc-500">
            Script content
            <textarea
              value={form.content}
              onChange={(e) => patch("content", e.target.value)}
              rows={14}
              className="mt-1 w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-100 outline-none"
              placeholder={"INT. LOCATION — DAY\n\nAction description.\n\nCHARACTER\nDialogue line."}
            />
          </label>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-xs text-zinc-500">Cancel</button>
            <button
              disabled={saving || !form.title.trim() || !form.content.trim()}
              className="rounded-lg bg-zinc-100 px-4 py-2 text-xs font-bold text-zinc-950 disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save Draft"}
            </button>
          </div>
        </form>
      )}

      {scripts.length === 0 && !showForm ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-10 text-center">
          <p className="text-sm text-zinc-400">No scripts yet.</p>
          <p className="mt-2 text-xs text-zinc-600">
            Develop scenes first in{" "}
            <Link href={`/production/${productionId}/scenes`} className="underline hover:text-zinc-400">Scenes</Link>,
            then write scripts here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {scripts.map((script) => (
            <div key={script.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  {script.storyContext && (
                    <p className="text-[10px] text-zinc-600 mb-0.5">{script.storyContext}</p>
                  )}
                  <h2 className="font-semibold text-zinc-100">{script.title}</h2>
                </div>
                <span className={`shrink-0 text-[10px] font-bold uppercase ${STATUS_STYLE[script.status]}`}>
                  {script.status}
                </span>
              </div>

              <pre className="mt-3 max-h-48 overflow-hidden whitespace-pre-wrap font-mono text-xs leading-6 text-zinc-500">
                {script.content}
              </pre>

              <div className="mt-4 flex items-center gap-4 text-xs">
                {script.status !== "approved" && (
                  <button onClick={() => void advance(script)} className="text-emerald-400 hover:text-emerald-300">
                    {script.status === "draft" ? "Send to review" : "Approve script"}
                  </button>
                )}
                {script.status === "approved" && (
                  <span className="text-emerald-500">Approved ✓</span>
                )}
                <span className="text-zinc-700 ml-auto">{script.linkedCanonIds.length} canon links</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
