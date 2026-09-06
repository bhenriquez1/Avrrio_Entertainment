"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/firebase/AuthProvider";
import { listEpisodes, listSeasons, saveEpisode } from "@/lib/production/repository";
import type { Episode, Season } from "@/types/episode";

const EMPTY_FORM = {
  title: "",
  logline: "",
  synopsis: "",
  runtime: "24",
  acts: "",
  beats: "",
  coldOpen: "",
  climax: "",
  resolution: "",
};

export default function EpisodesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: productionId } = use(params);
  const sp = useSearchParams();
  const { uid, status } = useAuth();

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonId, setSeasonId] = useState(sp.get("season") ?? "");
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const loadSeasons = useCallback(async () => {
    if (status !== "allowed") return;
    const s = (await listSeasons(uid, productionId)).sort((a, b) => a.number - b.number);
    setSeasons(s);
    setSeasonId((id) => id || s[0]?.id || "");
  }, [uid, productionId, status]);

  const loadEpisodes = useCallback(async () => {
    if (status !== "allowed" || !seasonId) return;
    setEpisodes((await listEpisodes(uid, productionId, seasonId)).sort((a, b) => a.number - b.number));
    setLoading(false);
  }, [uid, productionId, seasonId, status]);

  useEffect(() => { void loadSeasons(); }, [loadSeasons]);
  useEffect(() => { void loadEpisodes(); }, [loadEpisodes]);

  function patch(key: keyof typeof EMPTY_FORM, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!seasonId || !form.title.trim()) return;
    setSaving(true);
    await saveEpisode(uid, productionId, seasonId, {
      number: episodes.length + 1,
      title: form.title.trim(),
      logline: form.logline.trim(),
      synopsis: form.synopsis.trim(),
      targetRuntimeMinutes: Number(form.runtime) || 0,
      status: "development",
      canonDependencies: [],
      acts: form.acts.split("\n").filter(Boolean),
      storyBeats: form.beats.split("\n").filter(Boolean),
      coldOpen: form.coldOpen.trim(),
      climax: form.climax.trim(),
      resolution: form.resolution.trim(),
    });
    setForm(EMPTY_FORM);
    setShowForm(false);
    setSaving(false);
    await loadEpisodes();
  }

  const currentSeason = seasons.find((s) => s.id === seasonId);

  if (loading && seasons.length > 0) return <div className="p-8 text-sm text-zinc-500">Loading…</div>;

  return (
    <main className="p-8 max-w-4xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/production/${productionId}/seasons`} className="text-[10px] text-zinc-600 hover:text-zinc-400">
              Seasons
            </Link>
            <span className="text-[10px] text-zinc-700">›</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Episodes</span>
          </div>
          <h1 className="text-xl font-bold text-zinc-50">
            {currentSeason ? `Season ${currentSeason.number}: ${currentSeason.title}` : "Episodes"}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            {episodes.length} episode{episodes.length !== 1 ? "s" : ""} · {currentSeason?.targetRuntimeMinutes ?? currentSeason?.episodeCount ?? ""} {currentSeason?.episodeCount ? `planned` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {seasons.length > 1 && (
            <select
              value={seasonId}
              onChange={(e) => setSeasonId(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-300"
            >
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>Season {s.number}: {s.title}</option>
              ))}
            </select>
          )}
          <button
            onClick={() => setShowForm(true)}
            disabled={!seasonId}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-40"
          >
            + Episode
          </button>
        </div>
      </div>

      {!seasonId && (
        <div className="rounded-xl border border-dashed border-zinc-800 p-10 text-center">
          <p className="text-sm text-zinc-400">No seasons yet.</p>
          <Link href={`/production/${productionId}/seasons`} className="mt-2 inline-block text-xs text-zinc-500 underline hover:text-zinc-300">
            Create a season first →
          </Link>
        </div>
      )}

      {showForm && (
        <form onSubmit={submit} className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-100">Episode {episodes.length + 1}</h2>
            <button type="button" onClick={() => setShowForm(false)} className="text-zinc-600 hover:text-zinc-400 text-sm">×</button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs text-zinc-500">
              Episode title
              <input
                value={form.title}
                onChange={(e) => patch("title", e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600"
                placeholder="e.g. The Day Everything Changed"
              />
            </label>
            <label className="block text-xs text-zinc-500">
              Target runtime (min)
              <input
                type="number"
                value={form.runtime}
                onChange={(e) => patch("runtime", e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600"
              />
            </label>
            <label className="block text-xs text-zinc-500 sm:col-span-2">
              Logline
              <input
                value={form.logline}
                onChange={(e) => patch("logline", e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600"
                placeholder="One-sentence hook"
              />
            </label>
            <label className="block text-xs text-zinc-500">
              Cold open
              <input
                value={form.coldOpen}
                onChange={(e) => patch("coldOpen", e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600"
              />
            </label>
            <label className="block text-xs text-zinc-500">
              Climax
              <input
                value={form.climax}
                onChange={(e) => patch("climax", e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600"
              />
            </label>
            <label className="block text-xs text-zinc-500 sm:col-span-2">
              Resolution
              <input
                value={form.resolution}
                onChange={(e) => patch("resolution", e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600"
              />
            </label>
          </div>
          <label className="block text-xs text-zinc-500">
            Synopsis
            <textarea
              value={form.synopsis}
              onChange={(e) => patch("synopsis", e.target.value)}
              rows={3}
              className="mt-1 w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs text-zinc-500">
              Acts (one per line)
              <textarea
                value={form.acts}
                onChange={(e) => patch("acts", e.target.value)}
                rows={3}
                className="mt-1 w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600"
              />
            </label>
            <label className="block text-xs text-zinc-500">
              Story beats (one per line)
              <textarea
                value={form.beats}
                onChange={(e) => patch("beats", e.target.value)}
                rows={3}
                className="mt-1 w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600"
              />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-xs text-zinc-500">Cancel</button>
            <button
              disabled={saving || !form.title.trim()}
              className="rounded-lg bg-zinc-100 px-4 py-2 text-xs font-bold text-zinc-950 disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save Episode"}
            </button>
          </div>
        </form>
      )}

      {seasonId && episodes.length === 0 && !showForm && (
        <div className="rounded-xl border border-dashed border-zinc-800 p-10 text-center">
          <p className="text-sm text-zinc-400">No episodes yet for this season.</p>
          <p className="mt-2 text-xs text-zinc-600">Add an episode to start breaking down scenes.</p>
        </div>
      )}

      {episodes.length > 0 && (
        <div className="space-y-4">
          {episodes.map((ep) => (
            <div key={ep.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
                      Ep {ep.number}
                    </span>
                    {ep.targetRuntimeMinutes > 0 && (
                      <span className="text-[10px] text-zinc-600">{ep.targetRuntimeMinutes} min</span>
                    )}
                    <span className="text-[10px] text-zinc-600">{ep.status}</span>
                  </div>
                  <h2 className="text-base font-bold text-zinc-100">{ep.title}</h2>
                  {ep.logline && <p className="mt-1 text-sm text-zinc-400">{ep.logline}</p>}
                </div>
                <Link
                  href={`/production/${productionId}/scenes?season=${seasonId}&episode=${ep.id}`}
                  className="shrink-0 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  Scenes →
                </Link>
              </div>

              {ep.synopsis && <p className="mt-2 text-xs text-zinc-500 leading-5">{ep.synopsis}</p>}

              {(ep.coldOpen || ep.climax || ep.resolution) && (
                <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <p className="text-zinc-600 mb-0.5">Cold open</p>
                    <p className="text-zinc-400">{ep.coldOpen || "—"}</p>
                  </div>
                  <div>
                    <p className="text-zinc-600 mb-0.5">Climax</p>
                    <p className="text-zinc-400">{ep.climax || "—"}</p>
                  </div>
                  <div>
                    <p className="text-zinc-600 mb-0.5">Resolution</p>
                    <p className="text-zinc-400">{ep.resolution || "—"}</p>
                  </div>
                </div>
              )}

              {ep.storyBeats && ep.storyBeats.length > 0 && (
                <ol className="mt-3 list-decimal pl-5 space-y-0.5">
                  {ep.storyBeats.map((beat, i) => (
                    <li key={i} className="text-xs text-zinc-600">{beat}</li>
                  ))}
                </ol>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
