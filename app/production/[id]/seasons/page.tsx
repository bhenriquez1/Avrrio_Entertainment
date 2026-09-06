"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/firebase/AuthProvider";
import { listCanon } from "@/lib/production/repository";
import { listSeasons, saveSeason } from "@/lib/production/repository";
import type { Season } from "@/types/episode";

const STATUS_COLORS: Record<string, string> = {
  development: "text-amber-400 border-amber-900/40",
  "pre-production": "text-blue-400 border-blue-900/40",
  production: "text-emerald-400 border-emerald-900/40",
  "post-production": "text-violet-400 border-violet-900/40",
  complete: "text-zinc-400 border-zinc-700",
};

const EMPTY_FORM = { title: "", synopsis: "", theme: "", arc: "", beats: "", episodes: "10" };

interface GeneratedSeason {
  number: number;
  title: string;
  synopsis: string;
  episodes: Array<{ number: number; title: string; synopsis: string; canonDependencies: string[]; acts: string[] }>;
}

export default function SeasonsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: productionId } = use(params);
  const { uid, status, getIdToken } = useAuth();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [showGenerator, setShowGenerator] = useState(false);
  const [genLogline, setGenLogline] = useState("");
  const [genSeasons, setGenSeasons] = useState("1");
  const [genEpisodes, setGenEpisodes] = useState("10");
  const [genRuntime, setGenRuntime] = useState("25");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [proposed, setProposed] = useState<GeneratedSeason[]>([]);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (status !== "allowed") return;
    setSeasons((await listSeasons(uid, productionId)).sort((a, b) => a.number - b.number));
    setLoading(false);
  }, [uid, productionId, status]);

  useEffect(() => { void load(); }, [load]);

  function patch(key: keyof typeof EMPTY_FORM, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    await saveSeason(uid, productionId, {
      number: seasons.length + 1,
      title: form.title.trim(),
      synopsis: form.synopsis.trim(),
      theme: form.theme.trim(),
      arc: form.arc.trim(),
      storyBeats: form.beats.split("\n").map((x) => x.trim()).filter(Boolean),
      status: "development",
      episodeCount: Number(form.episodes) || 0,
    });
    setForm(EMPTY_FORM);
    setShowForm(false);
    setSaving(false);
    await load();
  }

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    setGenError("");
    setProposed([]);
    try {
      const token = await getIdToken();
      const canon = await listCanon(uid, productionId);
      const approvedCanon = canon.filter((c) => c.status === "approved");
      const response = await fetch("/api/seasons/generate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          productionTitle: "Avrrio",
          logline: genLogline.trim(),
          approvedCanon,
          targetSeasons: Number(genSeasons) || 1,
          targetEpisodesPerSeason: Number(genEpisodes) || 10,
          targetRuntimeMinutes: Number(genRuntime) || 25,
        }),
      });
      const data = (await response.json()) as { result?: { seasons: GeneratedSeason[] }; error?: string };
      if (!response.ok || data.error) {
        setGenError(data.error ?? "Generation failed.");
      } else {
        setProposed(data.result?.seasons ?? []);
      }
    } catch {
      setGenError("Generation failed.");
    }
    setGenerating(false);
  }

  async function saveProposed(gen: GeneratedSeason, index: number) {
    setSavingIndex(index);
    await saveSeason(uid, productionId, {
      number: seasons.length + 1,
      title: gen.title,
      synopsis: gen.synopsis,
      theme: "",
      arc: "",
      storyBeats: gen.episodes.map((ep) => `Ep ${ep.number}: ${ep.title} — ${ep.synopsis}`),
      status: "development",
      episodeCount: gen.episodes.length,
    });
    setProposed((prev) => prev.filter((_, i) => i !== index));
    setSavingIndex(null);
    await load();
  }

  if (loading) return <div className="p-8 text-sm text-zinc-500">Loading…</div>;

  return (
    <main className="p-8 max-w-4xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Story Hierarchy</p>
          <h1 className="mt-1 text-xl font-bold text-zinc-50">Seasons</h1>
          <p className="mt-1 text-sm text-zinc-400">Build the season arc and story beats before episodes and scenes.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowGenerator((v) => !v)}
            className="rounded-lg border border-amber-800/40 bg-amber-300/5 px-4 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-300/10 transition-colors"
          >
            ✦ Generate
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            + New Season
          </button>
        </div>
      </div>

      {showGenerator && (
        <form onSubmit={generate} className="mb-8 rounded-xl border border-amber-800/30 bg-amber-300/[.03] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">AI Structure Generator</h2>
              <p className="mt-0.5 text-xs text-zinc-500">Generates a proposed season/episode structure from your approved canon. You review and save each season.</p>
            </div>
            <button type="button" onClick={() => setShowGenerator(false)} className="text-zinc-600 hover:text-zinc-400 text-sm">×</button>
          </div>
          <label className="block text-xs text-zinc-500">
            Logline
            <textarea
              value={genLogline}
              onChange={(e) => setGenLogline(e.target.value)}
              rows={2}
              className="mt-1 w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none"
              placeholder="A one-sentence description of the show's premise…"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-xs text-zinc-500">
              Seasons
              <input
                type="number"
                min={1}
                max={5}
                value={genSeasons}
                onChange={(e) => setGenSeasons(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none"
              />
            </label>
            <label className="block text-xs text-zinc-500">
              Episodes per season
              <input
                type="number"
                min={1}
                max={26}
                value={genEpisodes}
                onChange={(e) => setGenEpisodes(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none"
              />
            </label>
            <label className="block text-xs text-zinc-500">
              Runtime (min/episode)
              <input
                type="number"
                min={5}
                max={60}
                value={genRuntime}
                onChange={(e) => setGenRuntime(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none"
              />
            </label>
          </div>
          {genError && <p className="text-xs text-red-400">{genError}</p>}
          <div className="flex justify-end">
            <button
              disabled={generating || !genLogline.trim()}
              className="rounded-lg bg-amber-300 px-4 py-2 text-xs font-bold text-zinc-950 disabled:opacity-40"
            >
              {generating ? "Generating…" : "Generate structure"}
            </button>
          </div>
        </form>
      )}

      {proposed.length > 0 && (
        <div className="mb-8 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-300/70">Proposed structure — review before saving</p>
          {proposed.map((gen, index) => (
            <div key={index} className="rounded-xl border border-amber-800/25 bg-amber-300/[.025] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] text-amber-300/60 uppercase tracking-wider">Season {gen.number} · {gen.episodes.length} episodes</p>
                  <h3 className="mt-1 font-semibold text-zinc-100">{gen.title}</h3>
                  <p className="mt-1 text-sm text-zinc-400">{gen.synopsis}</p>
                </div>
                <button
                  onClick={() => void saveProposed(gen, index)}
                  disabled={savingIndex === index}
                  className="shrink-0 rounded-lg border border-emerald-800/40 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-300/10 disabled:opacity-40 transition-colors"
                >
                  {savingIndex === index ? "Saving…" : "Save season"}
                </button>
              </div>
              <ol className="mt-3 space-y-1">
                {gen.episodes.map((ep) => (
                  <li key={ep.number} className="text-xs text-zinc-500">
                    <span className="text-zinc-400">Ep {ep.number}:</span> {ep.title} — {ep.synopsis}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <form onSubmit={submit} className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-100">Season {seasons.length + 1}</h2>
            <button type="button" onClick={() => setShowForm(false)} className="text-zinc-600 hover:text-zinc-400 text-sm">×</button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs text-zinc-500">
              Season title
              <input
                value={form.title}
                onChange={(e) => patch("title", e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600"
                placeholder="e.g. The Awakening"
              />
            </label>
            <label className="block text-xs text-zinc-500">
              Episode count
              <input
                type="number"
                value={form.episodes}
                onChange={(e) => patch("episodes", e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600"
              />
            </label>
            <label className="block text-xs text-zinc-500">
              Theme
              <input
                value={form.theme}
                onChange={(e) => patch("theme", e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600"
                placeholder="e.g. Identity vs. destiny"
              />
            </label>
            <label className="block text-xs text-zinc-500">
              Season arc
              <input
                value={form.arc}
                onChange={(e) => patch("arc", e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600"
                placeholder="e.g. Hero discovers their power"
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
          <label className="block text-xs text-zinc-500">
            Story beats (one per line)
            <textarea
              value={form.beats}
              onChange={(e) => patch("beats", e.target.value)}
              rows={4}
              className="mt-1 w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600"
              placeholder={"Act I: Inciting incident\nMid-point revelation\nAct III: Confrontation"}
            />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-xs text-zinc-500">Cancel</button>
            <button
              disabled={saving || !form.title.trim()}
              className="rounded-lg bg-zinc-100 px-4 py-2 text-xs font-bold text-zinc-950 disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save Season"}
            </button>
          </div>
        </form>
      )}

      {seasons.length === 0 && proposed.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-10 text-center">
          <p className="text-sm text-zinc-400">No seasons yet.</p>
          <p className="mt-2 text-xs text-zinc-600">Create a season to start building episode and scene structure.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {seasons.map((season) => (
            <div key={season.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Season {season.number}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_COLORS[season.status] ?? "text-zinc-500 border-zinc-700"}`}>
                      {season.status}
                    </span>
                    {season.episodeCount > 0 && (
                      <span className="text-[10px] text-zinc-600">{season.episodeCount} episodes</span>
                    )}
                  </div>
                  <h2 className="mt-1 text-base font-bold text-zinc-100">{season.title}</h2>
                </div>
                <Link
                  href={`/production/${productionId}/episodes?season=${season.id}`}
                  className="shrink-0 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  Episodes →
                </Link>
              </div>

              {season.synopsis && (
                <p className="mt-3 text-sm text-zinc-400 leading-5">{season.synopsis}</p>
              )}

              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
                {season.theme && <p className="text-xs text-zinc-600"><span className="text-zinc-500">Theme:</span> {season.theme}</p>}
                {season.arc && <p className="text-xs text-zinc-600"><span className="text-zinc-500">Arc:</span> {season.arc}</p>}
              </div>

              {season.storyBeats && season.storyBeats.length > 0 && (
                <ol className="mt-3 list-decimal pl-5 space-y-1">
                  {season.storyBeats.map((beat, i) => (
                    <li key={i} className="text-xs text-zinc-500">{beat}</li>
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
