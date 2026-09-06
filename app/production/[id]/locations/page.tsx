"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/firebase/AuthProvider";
import { listLocations, saveLocation } from "@/lib/production/repository";
import type { StoryLocation } from "@/types/production";

const EMPTY_FORM = {
  name: "",
  description: "",
  geography: "",
  timePeriod: "",
  visualLanguage: "",
  lighting: "",
  soundscape: "",
};

const FIELD_LABELS: Record<keyof typeof EMPTY_FORM, string> = {
  name: "Location name",
  description: "Description",
  geography: "Geography",
  timePeriod: "Era / time period",
  visualLanguage: "Visual language",
  lighting: "Lighting",
  soundscape: "Soundscape",
};

export default function LocationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: productionId } = use(params);
  const { uid, status } = useAuth();
  const [items, setItems] = useState<StoryLocation[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    if (status === "allowed") setItems(await listLocations(uid, productionId));
  }, [productionId, status, uid]);

  useEffect(() => { void load(); }, [load]);

  function patch(key: keyof typeof EMPTY_FORM, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) return;
    await saveLocation(uid, productionId, { ...form, status: "draft", linkedCanonIds: [] });
    setForm(EMPTY_FORM);
    setOpen(false);
    await load();
  }

  return (
    <main className="p-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[.28em] text-emerald-300/70">World continuity</p>
            <h1 className="mt-2 text-2xl font-semibold text-white">Locations</h1>
            <p className="mt-2 text-sm text-slate-400">Reusable location bibles for writing and visual providers.</p>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="rounded-xl bg-emerald-300 px-4 py-2 text-sm font-bold text-slate-950"
          >
            + Location
          </button>
        </div>

        {open && (
          <form onSubmit={save} className="mt-6 rounded-2xl border border-white/10 bg-white/[.025] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">New Location</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300 text-sm">×</button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {(Object.keys(EMPTY_FORM) as (keyof typeof EMPTY_FORM)[]).map((key) => (
                key === "description" || key === "soundscape" || key === "visualLanguage" ? (
                  <label key={key} className={`block text-xs text-slate-400 ${key === "description" ? "md:col-span-2" : ""}`}>
                    {FIELD_LABELS[key]}
                    <textarea
                      value={form[key]}
                      onChange={(e) => patch(key, e.target.value)}
                      rows={key === "description" ? 3 : 2}
                      className="mt-1.5 w-full resize-none rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm text-white outline-none"
                    />
                  </label>
                ) : (
                  <label key={key} className="block text-xs text-slate-400">
                    {FIELD_LABELS[key]}
                    <input
                      value={form[key]}
                      onChange={(e) => patch(key, e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm text-white outline-none"
                    />
                  </label>
                )
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-xs text-slate-500">Cancel</button>
              <button
                disabled={!form.name}
                className="rounded-lg bg-white px-4 py-2 text-xs font-bold text-slate-950 disabled:opacity-40"
              >
                Save Location
              </button>
            </div>
          </form>
        )}

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {items.map((loc) => (
            <article key={loc.id} className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
              <p className="text-[10px] uppercase tracking-wider text-emerald-300">{loc.status}</p>
              <h2 className="mt-2 text-lg font-semibold text-white">{loc.name}</h2>
              {loc.description && <p className="mt-2 text-sm text-slate-400">{loc.description}</p>}
              <dl className="mt-4 grid gap-1.5 text-xs text-slate-500">
                {loc.geography && <div><span className="text-slate-600">Geography:</span> {loc.geography}</div>}
                {loc.timePeriod && <div><span className="text-slate-600">Era:</span> {loc.timePeriod}</div>}
                {loc.visualLanguage && <div><span className="text-slate-600">Visual language:</span> {loc.visualLanguage}</div>}
                {loc.lighting && <div><span className="text-slate-600">Lighting:</span> {loc.lighting}</div>}
                {loc.soundscape && <div><span className="text-slate-600">Soundscape:</span> {loc.soundscape}</div>}
              </dl>
            </article>
          ))}
          {items.length === 0 && !open && (
            <p className="col-span-full rounded-2xl border border-dashed border-white/10 py-16 text-center text-sm text-slate-500">
              No locations yet.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
