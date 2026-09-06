"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/firebase/AuthProvider";
import { listShots, saveProductionJob, saveShot } from "@/lib/production/repository";
import type { ProductionShot } from "@/types/production";

const STATUS_STYLE: Record<string, string> = {
  draft: "border-zinc-700 text-zinc-500",
  review: "border-amber-900/40 text-amber-400",
  approved: "border-emerald-900/40 text-emerald-400",
};

const EMPTY_FORM = { title: "", context: "", description: "", camera: "", duration: "5" };

export default function ShotsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: productionId } = use(params);
  const { uid, status } = useAuth();
  const [shots, setShots] = useState<ProductionShot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (status !== "allowed") return;
    setShots((await listShots(uid, productionId)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    setLoading(false);
  }, [uid, productionId, status]);

  useEffect(() => { void load(); }, [load]);

  function patch(key: keyof typeof EMPTY_FORM, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return;
    setSaving(true);
    const shot = await saveShot(uid, productionId, {
      title: form.title.trim(),
      sceneContext: form.context.trim(),
      description: form.description.trim(),
      camera: form.camera.trim(),
      durationSeconds: Number(form.duration) || 5,
      status: "draft",
      productionJobId: null,
    });
    setShots((s) => [shot, ...s]);
    setForm(EMPTY_FORM);
    setShowForm(false);
    setSaving(false);
  }

  async function advance(shot: ProductionShot) {
    const next = shot.status === "draft" ? "review" : "approved";
    const saved = await saveShot(uid, productionId, { ...shot, status: next });
    setShots((s) => s.map((item) => item.id === shot.id ? saved : item));
  }

  async function queueShot(shot: ProductionShot) {
    if (shot.productionJobId) return;
    const job = await saveProductionJob(uid, productionId, {
      title: shot.title,
      provider: "runway",
      assetType: "video",
      prompt: `${shot.description}\n\nCamera: ${shot.camera}\nDuration: ${shot.durationSeconds} seconds`,
      context: shot.sceneContext,
      status: "draft",
      providerJobId: null,
      outputUrls: [],
      error: null,
    });
    const saved = await saveShot(uid, productionId, { ...shot, productionJobId: job.id });
    setShots((s) => s.map((item) => item.id === shot.id ? saved : item));
  }

  if (loading) return <div className="p-8 text-sm text-zinc-500">Loading…</div>;

  return (
    <main className="p-8 max-w-4xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Cinematography</p>
          <h1 className="mt-1 text-xl font-bold text-zinc-50">Shot List</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Approve camera-ready shots, then prepare them for Runway or Kling.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-lg border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors"
        >
          + New Shot
        </button>
      </div>

      {showForm && (
        <form onSubmit={create} className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-100">New Shot</h2>
            <button type="button" onClick={() => setShowForm(false)} className="text-zinc-600 hover:text-zinc-400 text-sm">×</button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs text-zinc-500">
              Shot title
              <input
                value={form.title}
                onChange={(e) => patch("title", e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none"
                placeholder="e.g. Samantha wide — awakening"
              />
            </label>
            <label className="block text-xs text-zinc-500">
              Scene context
              <input
                value={form.context}
                onChange={(e) => patch("context", e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none"
                placeholder="S1 · Ep 1 · Scene 3"
              />
            </label>
          </div>
          <label className="block text-xs text-zinc-500">
            Visual subject and action
            <textarea
              value={form.description}
              onChange={(e) => patch("description", e.target.value)}
              rows={4}
              className="mt-1 w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none"
              placeholder="What is in the frame? Character position, movement, lighting, environment."
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs text-zinc-500">
              Camera and movement
              <input
                value={form.camera}
                onChange={(e) => patch("camera", e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none"
                placeholder="Slow push-in, shoulder height"
              />
            </label>
            <label className="block text-xs text-zinc-500">
              Duration (seconds)
              <input
                type="number"
                min={1}
                max={10}
                value={form.duration}
                onChange={(e) => patch("duration", e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none"
              />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-xs text-zinc-500">Cancel</button>
            <button
              disabled={saving || !form.title.trim() || !form.description.trim()}
              className="rounded-lg bg-zinc-100 px-4 py-2 text-xs font-bold text-zinc-950 disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save Draft"}
            </button>
          </div>
        </form>
      )}

      {shots.length === 0 && !showForm ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-10 text-center">
          <p className="text-sm text-zinc-400">No shots yet.</p>
          <p className="mt-2 text-xs text-zinc-600">
            Break approved{" "}
            <Link href={`/production/${productionId}/scenes`} className="underline hover:text-zinc-400">scenes</Link>
            {" "}into individual camera shots here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {shots.map((shot) => (
            <div key={shot.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  {shot.sceneContext && <p className="text-[10px] text-zinc-600 mb-0.5">{shot.sceneContext}</p>}
                  <h2 className="font-semibold text-zinc-100 text-sm">{shot.title}</h2>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_STYLE[shot.status]}`}>
                  {shot.status}
                </span>
              </div>

              <p className="text-sm leading-5 text-zinc-400">{shot.description}</p>

              <p className="mt-2 text-xs text-zinc-600">
                {shot.camera || "Camera not set"} · {shot.durationSeconds}s
              </p>

              <div className="mt-3 flex flex-wrap gap-3 text-xs">
                {shot.status !== "approved" && (
                  <button onClick={() => void advance(shot)} className="text-amber-400 hover:text-amber-300">
                    {shot.status === "draft" ? "Send to review" : "Approve shot"}
                  </button>
                )}
                {shot.status === "approved" && !shot.productionJobId && (
                  <button onClick={() => void queueShot(shot)} className="text-zinc-300 hover:text-white">
                    Prepare Runway draft →
                  </button>
                )}
                {shot.productionJobId && (
                  <Link href={`/production/${productionId}/production-queue`} className="text-emerald-400">
                    Queued ✓
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
