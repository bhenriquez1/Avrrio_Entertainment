"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/firebase/AuthProvider";
import { listCanon, listScenes, saveProductionJob, saveScene } from "@/lib/production/repository";
import type { CanonRecord } from "@/types/canon";
import type { StoryScene } from "@/types/production";

const STATUS_STYLE = { draft: "border-slate-400/20 text-slate-400", review: "border-amber-300/20 text-amber-300", approved: "border-emerald-300/20 text-emerald-300" };

export default function ScenesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: productionId } = use(params);
  const { uid, status } = useAuth();
  const [scenes, setScenes] = useState<StoryScene[]>([]);
  const [canon, setCanon] = useState<CanonRecord[]>([]);
  const [showComposer, setShowComposer] = useState(false);
  const [title, setTitle] = useState("");
  const [storyContext, setStoryContext] = useState("");
  const [action, setAction] = useState("");
  const [visualDirection, setVisualDirection] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (status !== "allowed") return;
    const [savedScenes, savedCanon] = await Promise.all([listScenes(uid, productionId), listCanon(uid, productionId)]);
    setScenes(savedScenes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    setCanon(savedCanon.filter((item) => item.status === "approved"));
  }, [productionId, status, uid]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  const canonContext = useMemo(() => canon.map((item) => `${item.title}: ${item.statement}`).join("\n"), [canon]);

  async function createScene(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim() || !action.trim()) return;
    setSaving(true);
    const created = await saveScene(uid, productionId, { title: title.trim(), storyContext: storyContext.trim(), action: action.trim(), visualDirection: visualDirection.trim(), status: "draft", linkedCanonIds: canon.map((item) => item.id), productionJobId: null });
    setScenes((current) => [created, ...current]);
    setTitle(""); setStoryContext(""); setAction(""); setVisualDirection(""); setShowComposer(false); setSaving(false);
  }

  async function setSceneStatus(scene: StoryScene, nextStatus: StoryScene["status"]) {
    const updated = await saveScene(uid, productionId, { ...scene, status: nextStatus });
    setScenes((current) => current.map((item) => item.id === scene.id ? updated : item));
  }

  async function sendToProduction(scene: StoryScene) {
    if (scene.status !== "approved" || scene.productionJobId) return;
    const context = [scene.storyContext, canonContext && `Approved Story Memory:\n${canonContext}`].filter(Boolean).join("\n\n");
    const job = await saveProductionJob(uid, productionId, { title: scene.title, provider: "runway", assetType: "video", prompt: [scene.action, scene.visualDirection].filter(Boolean).join("\n\nVisual direction: "), context, status: "draft", providerJobId: null, outputUrls: [], error: null });
    const updated = await saveScene(uid, productionId, { ...scene, productionJobId: job.id });
    setScenes((current) => current.map((item) => item.id === scene.id ? updated : item));
  }

  return <main className="min-h-full bg-[radial-gradient(circle_at_top_right,rgba(30,64,175,.14),transparent_36%)] p-8"><div className="mx-auto max-w-6xl">
    <div className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-300/70">Pre-Production</p><h1 className="mt-2 text-2xl font-semibold text-white">Scenes</h1><p className="mt-2 text-sm text-slate-400">Develop each scene against approved Story Memory, then hand it to production.</p></div><button onClick={() => setShowComposer(true)} className="rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-bold text-slate-950">+ New Scene</button></div>
    <div className="mt-6 rounded-xl border border-blue-200/10 bg-white/[0.025] px-4 py-3 text-xs text-slate-500"><span className="font-semibold text-slate-300">Shared Story Memory:</span> {canon.length} approved canon facts will travel with every scene sent to production.</div>
    {showComposer && <form onSubmit={createScene} className="mt-6 rounded-2xl border border-cyan-200/15 bg-[#0b1122] p-6"><div className="flex justify-between"><h2 className="font-semibold text-white">Develop scene</h2><button type="button" onClick={() => setShowComposer(false)} className="text-slate-500">×</button></div><div className="mt-5 grid gap-4 md:grid-cols-2"><label className="text-xs text-slate-400">Scene title<input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1.5 w-full rounded-lg border border-blue-200/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none" placeholder="Samantha's dream — opening" /></label><label className="text-xs text-slate-400">Story position<input value={storyContext} onChange={(event) => setStoryContext(event.target.value)} className="mt-1.5 w-full rounded-lg border border-blue-200/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none" placeholder="Season 1 • Episode 1 • Scene 1" /></label></div><label className="mt-4 block text-xs text-slate-400">Action and performance<textarea value={action} onChange={(event) => setAction(event.target.value)} rows={5} className="mt-1.5 w-full resize-none rounded-lg border border-blue-200/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none" placeholder="What happens in the scene? Include character intention and emotional beat." /></label><label className="mt-4 block text-xs text-slate-400">Visual direction<textarea value={visualDirection} onChange={(event) => setVisualDirection(event.target.value)} rows={3} className="mt-1.5 w-full resize-none rounded-lg border border-blue-200/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none" placeholder="Camera, composition, lighting, motion, environment…" /></label><div className="mt-4 flex items-center justify-between"><p className="text-[11px] text-cyan-200/50">Draft only. No generation or provider charge.</p><button disabled={saving || !title.trim() || !action.trim()} className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-30">{saving ? "Saving…" : "Save Scene"}</button></div></form>}
    <section className="mt-8 grid gap-4 md:grid-cols-2">{scenes.map((scene) => <article key={scene.id} className="rounded-2xl border border-blue-200/10 bg-white/[0.025] p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-[9px] uppercase tracking-[0.2em] text-blue-200/35">{scene.storyContext || "Unplaced scene"}</p><h2 className="mt-1 font-semibold text-white">{scene.title}</h2></div><span className={`rounded-full border px-2 py-1 text-[9px] font-bold uppercase ${STATUS_STYLE[scene.status]}`}>{scene.status}</span></div><p className="mt-4 text-sm leading-6 text-slate-400">{scene.action}</p>{scene.visualDirection && <p className="mt-3 border-l border-cyan-300/20 pl-3 text-xs leading-5 text-slate-500">{scene.visualDirection}</p>}<p className="mt-4 text-[10px] text-slate-600">Linked to {scene.linkedCanonIds.length} Story Memory facts</p><div className="mt-4 flex flex-wrap gap-4 text-xs">{scene.status === "draft" && <button onClick={() => void setSceneStatus(scene, "review")} className="text-amber-300">Send to review</button>}{scene.status === "review" && <button onClick={() => void setSceneStatus(scene, "approved")} className="text-emerald-300">Approve scene</button>}{scene.status === "approved" && !scene.productionJobId && <button onClick={() => void sendToProduction(scene)} className="text-cyan-300">Send to Production Queue</button>}{scene.productionJobId && <span className="text-emerald-400">Production draft prepared ✓</span>}</div></article>)}{scenes.length === 0 && <div className="col-span-full rounded-2xl border border-dashed border-blue-200/10 py-16 text-center"><p className="text-sm text-slate-400">No scenes developed yet.</p><p className="mt-2 text-xs text-slate-600">Create a scene, review it, approve it, then prepare it for a provider.</p></div>}</section>
  </div></main>;
}
