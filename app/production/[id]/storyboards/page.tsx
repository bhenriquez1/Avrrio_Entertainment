"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/firebase/AuthProvider";
import { listScenes, listShots } from "@/lib/production/repository";
import type { StoryScene, ProductionShot } from "@/types/production";

type SceneWithShots = StoryScene & { shots: ProductionShot[] };

export default function StoryboardsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: productionId } = use(params);
  const { uid, status } = useAuth();
  const [scenes, setScenes] = useState<SceneWithShots[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedScene, setExpandedScene] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (status !== "allowed") return;
    const [allScenes, allShots] = await Promise.all([
      listScenes(uid, productionId),
      listShots(uid, productionId),
    ]);
    const approved = allScenes
      .filter((s) => s.status === "approved")
      .sort((a, b) => (a.sceneNumber ?? 0) - (b.sceneNumber ?? 0));
    const withShots: SceneWithShots[] = approved.map((scene) => ({
      ...scene,
      shots: allShots.filter((sh) => sh.sceneContext === scene.id),
    }));
    setScenes(withShots);
    if (withShots.length > 0) setExpandedScene(withShots[0].id);
    setLoading(false);
  }, [uid, productionId, status]);

  useEffect(() => { void load(); }, [load]);

  const totalShots = scenes.reduce((sum, s) => sum + s.shots.length, 0);
  const totalSeconds = scenes.reduce(
    (sum, s) => sum + s.shots.reduce((ss, sh) => ss + (sh.durationSeconds ?? 0), 0),
    0
  );

  return (
    <main className="flex h-full min-h-0 flex-col">
      <div className="border-b border-zinc-800 px-6 pt-6 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Production</p>
            <h1 className="mt-1 text-xl font-bold text-zinc-50">Storyboards</h1>
            <p className="mt-1 text-sm text-zinc-400">Visual shot breakdown for approved scenes.</p>
          </div>
          <Link
            href={`/production/${productionId}/shots`}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            Manage Shots
          </Link>
        </div>
        {!loading && scenes.length > 0 && (
          <div className="mt-4 flex gap-6">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-zinc-600">Scenes</p>
              <p className="text-lg font-bold text-zinc-100">{scenes.length}</p>
            </div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-zinc-600">Shots</p>
              <p className="text-lg font-bold text-zinc-100">{totalShots}</p>
            </div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-zinc-600">Est. Runtime</p>
              <p className="text-lg font-bold text-zinc-100">
                {Math.floor(totalSeconds / 60)}:{String(totalSeconds % 60).padStart(2, "0")}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {loading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : scenes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 p-10 text-center">
            <p className="text-sm text-zinc-400">No approved scenes yet.</p>
            <p className="mt-2 text-xs leading-5 text-zinc-600">
              Create scenes in the{" "}
              <Link href={`/production/${productionId}/scenes`} className="underline hover:text-zinc-400">
                Scenes
              </Link>{" "}
              page and approve them to begin storyboarding.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {scenes.map((scene) => {
              const open = expandedScene === scene.id;
              const sceneSeconds = scene.shots.reduce((s, sh) => s + (sh.durationSeconds ?? 0), 0);
              return (
                <div key={scene.id} className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zinc-800/50 transition-colors"
                    onClick={() => setExpandedScene(open ? null : scene.id)}
                  >
                    <div className="flex items-center gap-3">
                      {scene.sceneNumber != null && (
                        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400">
                          {scene.sceneNumber}
                        </span>
                      )}
                      <div>
                        <p className="text-sm font-semibold text-zinc-100">{scene.title}</p>
                        {scene.act && (
                          <p className="text-[10px] text-zinc-600 uppercase tracking-widest mt-0.5">Act {scene.act}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <span className="text-xs text-zinc-500">{scene.shots.length} shot{scene.shots.length !== 1 ? "s" : ""}</span>
                      {sceneSeconds > 0 && (
                        <span className="text-xs text-zinc-600">
                          {Math.floor(sceneSeconds / 60)}:{String(sceneSeconds % 60).padStart(2, "0")}
                        </span>
                      )}
                      <span className="text-zinc-600 text-xs">{open ? "▲" : "▼"}</span>
                    </div>
                  </button>

                  {open && (
                    <div className="border-t border-zinc-800 px-5 py-4">
                      {scene.storyContext && (
                        <p className="text-xs text-zinc-500 mb-4 leading-5">{scene.storyContext}</p>
                      )}
                      {scene.shots.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-zinc-800 p-5 text-center">
                          <p className="text-xs text-zinc-600">No shots for this scene yet.</p>
                          <Link
                            href={`/production/${productionId}/shots`}
                            className="mt-2 inline-block text-xs text-zinc-500 underline hover:text-zinc-300"
                          >
                            Add shots →
                          </Link>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {scene.shots.map((shot, idx) => (
                            <div key={shot.id} className="rounded-lg border border-zinc-700 bg-zinc-950 p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">
                                  Shot {idx + 1}
                                </span>
                                {shot.durationSeconds > 0 && (
                                  <span className="text-[10px] text-zinc-600">{shot.durationSeconds}s</span>
                                )}
                              </div>
                              <p className="text-xs font-semibold text-zinc-200 mb-1">{shot.title}</p>
                              {shot.description && (
                                <p className="text-xs text-zinc-500 leading-4 line-clamp-3">{shot.description}</p>
                              )}
                              {shot.camera && (
                                <p className="mt-2 text-[10px] text-amber-400/60 font-mono">{shot.camera}</p>
                              )}
                              <div className="mt-2 flex items-center gap-1.5">
                                <span className={`h-1.5 w-1.5 rounded-full ${
                                  shot.status === "approved" ? "bg-emerald-400" :
                                  shot.status === "review" ? "bg-amber-400" : "bg-zinc-600"
                                }`} />
                                <span className="text-[10px] text-zinc-600 capitalize">{shot.status}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
