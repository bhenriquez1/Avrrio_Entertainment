"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/firebase/AuthProvider";
import { listCanon, listEpisodes, listScenes, listSeasons, saveProductionJob, saveScene } from "@/lib/production/repository";
import type { CanonRecord } from "@/types/canon";
import type { StoryScene } from "@/types/production";
import type { Episode, Season } from "@/types/episode";

const STATUS_STYLE: Record<string, string> = {
  draft: "border-zinc-700 text-zinc-500",
  review: "border-amber-900/40 text-amber-400",
  approved: "border-emerald-900/40 text-emerald-400",
};

const EMPTY_FORM = { title: "", storyContext: "", action: "", visualDirection: "", act: "", storyBeat: "" };

export default function ScenesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: productionId } = use(params);
  const sp = useSearchParams();
  const { uid, status } = useAuth();

  const [scenes, setScenes] = useState<StoryScene[]>([]);
  const [canon, setCanon] = useState<CanonRecord[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showComposer, setShowComposer] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const seasonId = sp.get("season") ?? "";
  const episodeId = sp.get("episode") ?? "";

  const load = useCallback(async () => {
    if (status !== "allowed") return;
    const [savedScenes, savedCanon, savedSeasons] = await Promise.all([
      listScenes(uid, productionId),
      listCanon(uid, productionId),
      listSeasons(uid, productionId),
    ]);
    const approvedCanon = savedCanon.filter((c) => c.status === "approved");
    setScenes(savedScenes.sort((a, b) => (a.sceneNumber ?? 0) - (b.sceneNumber ?? 0)));
    setCanon(approvedCanon);
    setSeasons(savedSeasons.sort((a, b) => a.number - b.number));

    if (seasonId) {
      const eps = await listEpisodes(uid, productionId, seasonId);
      setEpisodes(eps.sort((a, b) => a.number - b.number));
    }
    setLoading(false);
  }, [productionId, status, uid, seasonId]);

  useEffect(() => { void load(); }, [load]);

  const canonContext = useMemo(
    () => canon.map((c) => `${c.title}: ${c.statement}`).join("\n"),
    [canon],
  );

  const currentSeason = seasons.find((s) => s.id === seasonId);
  const currentEpisode = episodes.find((e) => e.id === episodeId);
  const filteredScenes = episodeId
    ? scenes.filter((s) => s.episodeId === episodeId)
    : seasonId
    ? scenes.filter((s) => s.seasonId === seasonId)
    : scenes;

  function patch(key: keyof typeof EMPTY_FORM, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function createScene(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim() || !form.action.trim()) return;
    setSaving(true);
    const created = await saveScene(uid, productionId, {
      title: form.title.trim(),
      storyContext: form.storyContext.trim(),
      action: form.action.trim(),
      visualDirection: form.visualDirection.trim(),
      act: form.act.trim(),
      storyBeat: form.storyBeat.trim(),
      seasonId: seasonId || undefined,
      episodeId: episodeId || undefined,
      sceneNumber: filteredScenes.length + 1,
      status: "draft",
      linkedCanonIds: canon.map((c) => c.id),
      productionJobId: null,
    });
    setScenes((s) => [created, ...s]);
    setForm(EMPTY_FORM);
    setShowComposer(false);
    setSaving(false);
  }

  async function setSceneStatus(scene: StoryScene, nextStatus: StoryScene["status"]) {
    const updated = await saveScene(uid, productionId, { ...scene, status: nextStatus });
    setScenes((s) => s.map((item) => item.id === scene.id ? updated : item));
  }

  async function sendToProduction(scene: StoryScene) {
    if (scene.status !== "approved" || scene.productionJobId) return;
    const context = [scene.storyContext, canonContext && `Approved Story Memory:\n${canonContext}`]
      .filter(Boolean).join("\n\n");
    const job = await saveProductionJob(uid, productionId, {
      title: scene.title,
      provider: "runway",
      assetType: "video",
      prompt: [scene.action, scene.visualDirection].filter(Boolean).join("\n\nVisual direction: "),
      context,
      status: "draft",
      providerJobId: null,
      outputUrls: [],
      error: null,
    });
    const updated = await saveScene(uid, productionId, { ...scene, productionJobId: job.id });
    setScenes((s) => s.map((item) => item.id === scene.id ? updated : item));
  }

  if (loading) return <div className="p-8 text-sm text-zinc-500">Loading…</div>;

  return (
    <main className="p-8 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-1">
        <Link href={`/production/${productionId}/seasons`} className="text-[10px] text-zinc-600 hover:text-zinc-400">Seasons</Link>
        {currentSeason && (
          <>
            <span className="text-[10px] text-zinc-700">›</span>
            <Link
              href={`/production/${productionId}/episodes?season=${seasonId}`}
              className="text-[10px] text-zinc-600 hover:text-zinc-400"
            >
              S{currentSeason.number}
            </Link>
          </>
        )}
        {currentEpisode && (
          <>
            <span className="text-[10px] text-zinc-700">›</span>
            <span className="text-[10px] text-zinc-500">Ep {currentEpisode.number}</span>
          </>
        )}
        <span className="text-[10px] text-zinc-700">›</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Scenes</span>
      </div>

      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-50">
            {currentEpisode ? currentEpisode.title : currentSeason ? currentSeason.title : "All Scenes"}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            {filteredScenes.length} scene{filteredScenes.length !== 1 ? "s" : ""} · {canon.length} approved canon facts
          </p>
        </div>
        <button
          onClick={() => setShowComposer(true)}
          className="rounded-lg border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors"
        >
          + New Scene
        </button>
      </div>

      {showComposer && (
        <form onSubmit={createScene} className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-100">New Scene</h2>
            <button type="button" onClick={() => setShowComposer(false)} className="text-zinc-600 hover:text-zinc-400 text-sm">×</button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs text-zinc-500">
              Scene title
              <input
                value={form.title}
                onChange={(e) => patch("title", e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none"
                placeholder="e.g. Samantha's dream — opening"
              />
            </label>
            <label className="block text-xs text-zinc-500">
              Story position
              <input
                value={form.storyContext}
                onChange={(e) => patch("storyContext", e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none"
                placeholder="S1 · E1 · Scene 1"
              />
            </label>
            <label className="block text-xs text-zinc-500">
              Act
              <input
                value={form.act}
                onChange={(e) => patch("act", e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none"
                placeholder="Act I"
              />
            </label>
            <label className="block text-xs text-zinc-500">
              Story beat
              <input
                value={form.storyBeat}
                onChange={(e) => patch("storyBeat", e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none"
                placeholder="Inciting incident"
              />
            </label>
          </div>
          <label className="block text-xs text-zinc-500">
            Action and performance
            <textarea
              value={form.action}
              onChange={(e) => patch("action", e.target.value)}
              rows={5}
              className="mt-1 w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none"
              placeholder="What happens? Include character intention and emotional beat."
            />
          </label>
          <label className="block text-xs text-zinc-500">
            Visual direction
            <textarea
              value={form.visualDirection}
              onChange={(e) => patch("visualDirection", e.target.value)}
              rows={3}
              className="mt-1 w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none"
              placeholder="Camera, composition, lighting, motion, environment…"
            />
          </label>
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-zinc-600">Draft only. No generation or provider charge.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowComposer(false)} className="px-4 py-2 text-xs text-zinc-500">Cancel</button>
              <button
                disabled={saving || !form.title.trim() || !form.action.trim()}
                className="rounded-lg bg-zinc-100 px-4 py-2 text-xs font-bold text-zinc-950 disabled:opacity-40"
              >
                {saving ? "Saving…" : "Save Scene"}
              </button>
            </div>
          </div>
        </form>
      )}

      {filteredScenes.length === 0 && !showComposer ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-10 text-center">
          <p className="text-sm text-zinc-400">No scenes yet.</p>
          <p className="mt-2 text-xs text-zinc-600">Create a scene, review it, approve it, then prepare it for production.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredScenes.map((scene) => (
            <div key={scene.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <p className="text-[10px] text-zinc-600 mb-0.5">
                    {scene.storyContext || "Unplaced"}{scene.act ? ` · ${scene.act}` : ""}{scene.storyBeat ? ` · ${scene.storyBeat}` : ""}
                  </p>
                  <h2 className="font-semibold text-zinc-100 text-sm">{scene.title}</h2>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_STYLE[scene.status]}`}>
                  {scene.status}
                </span>
              </div>

              <p className="text-sm leading-5 text-zinc-400">{scene.action}</p>

              {scene.visualDirection && (
                <p className="mt-2 border-l-2 border-zinc-700 pl-3 text-xs leading-5 text-zinc-500 italic">
                  {scene.visualDirection}
                </p>
              )}

              <p className="mt-3 text-[10px] text-zinc-700">
                Linked to {scene.linkedCanonIds.length} canon facts
              </p>

              <div className="mt-3 flex flex-wrap gap-3 text-xs">
                {scene.status === "draft" && (
                  <button onClick={() => void setSceneStatus(scene, "review")} className="text-amber-400 hover:text-amber-300">
                    Send to review
                  </button>
                )}
                {scene.status === "review" && (
                  <button onClick={() => void setSceneStatus(scene, "approved")} className="text-emerald-400 hover:text-emerald-300">
                    Approve scene
                  </button>
                )}
                {scene.status === "approved" && !scene.productionJobId && (
                  <button onClick={() => void sendToProduction(scene)} className="text-zinc-300 hover:text-white">
                    Send to Production Queue →
                  </button>
                )}
                {scene.productionJobId && (
                  <Link
                    href={`/production/${productionId}/production-queue`}
                    className="text-emerald-400"
                  >
                    Production draft prepared ✓
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
