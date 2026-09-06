"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/firebase/AuthProvider";
import { listTimelineEvents, saveTimelineEvent } from "@/lib/production/repository";
import type { TimelineEvent } from "@/types/production";

const STATUS_COLORS: Record<string, string> = {
  draft: "text-zinc-600",
  review: "text-amber-400",
  approved: "text-emerald-400",
};

const EMPTY_FORM = { title: "", era: "", dateLabel: "", description: "" };

export default function TimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: productionId } = use(params);
  const { uid, status } = useAuth();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (status !== "allowed") return;
    setEvents((await listTimelineEvents(uid, productionId)).sort((a, b) => a.order - b.order));
    setLoading(false);
  }, [uid, productionId, status]);

  useEffect(() => { void load(); }, [load]);

  function patch(key: keyof typeof EMPTY_FORM, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    await saveTimelineEvent(uid, productionId, {
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      order: events.length + 1,
      seasonId: null,
      episodeId: null,
      sceneId: null,
      status: "draft",
      linkedCanonIds: [],
    });
    setForm(EMPTY_FORM);
    setShowForm(false);
    setSaving(false);
    await load();
  }

  async function advanceStatus(event: TimelineEvent) {
    const next = event.status === "draft" ? "review" : "approved";
    const updated = await saveTimelineEvent(uid, productionId, { ...event, status: next });
    setEvents((prev) => prev.map((e) => (e.id === event.id ? updated : e)));
  }

  if (loading) return <div className="p-8 text-sm text-zinc-500">Loading…</div>;

  return (
    <main className="p-8 max-w-3xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Story Chronology</p>
          <h1 className="mt-1 text-xl font-bold text-zinc-50">Timeline</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Canon chronology — ordered separately from episode structure.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-lg border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors"
        >
          + Add Event
        </button>
      </div>

      {showForm && (
        <form onSubmit={save} className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-100">New Timeline Event</h2>
            <button type="button" onClick={() => setShowForm(false)} className="text-zinc-600 hover:text-zinc-400 text-sm">×</button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs text-zinc-500 sm:col-span-2">
              Event title
              <input
                value={form.title}
                onChange={(e) => patch("title", e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none"
                placeholder="e.g. The Great Collapse"
              />
            </label>
            <label className="block text-xs text-zinc-500">
              Era
              <input
                value={form.era}
                onChange={(e) => patch("era", e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none"
                placeholder="Before the Show, Year 1…"
              />
            </label>
            <label className="block text-xs text-zinc-500">
              Story date
              <input
                value={form.dateLabel}
                onChange={(e) => patch("dateLabel", e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none"
                placeholder="15 years before S1E1"
              />
            </label>
          </div>
          <label className="block text-xs text-zinc-500">
            What happens
            <textarea
              value={form.description}
              onChange={(e) => patch("description", e.target.value)}
              rows={3}
              className="mt-1 w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-xs text-zinc-500">Cancel</button>
            <button
              disabled={saving || !form.title.trim()}
              className="rounded-lg bg-zinc-100 px-4 py-2 text-xs font-bold text-zinc-950 disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save Event"}
            </button>
          </div>
        </form>
      )}

      {events.length === 0 && !showForm ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-10 text-center">
          <p className="text-sm text-zinc-400">No timeline events yet.</p>
          <p className="mt-2 text-xs text-zinc-600">
            Track the story chronology here — past events, future reveals, and in-universe history.{" "}
            <Link href={`/production/${productionId}/creative-room`} className="underline hover:text-zinc-400">
              Develop history in the Creative Room
            </Link>
            {" "}and propose events to canon.
          </p>
        </div>
      ) : (
        <ol className="relative border-l border-zinc-800 pl-7 space-y-6">
          {events.map((event) => (
            <li key={event.id} className="relative">
              <span className="absolute -left-[34px] top-4 h-3 w-3 rounded-full bg-amber-300/60 ring-4 ring-zinc-950" />
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] text-zinc-500">
                      {[event.era, event.dateLabel].filter(Boolean).join(" · ")}
                    </p>
                    <h2 className="mt-0.5 font-semibold text-zinc-100">{event.title}</h2>
                  </div>
                  <span className={`shrink-0 text-[10px] font-semibold uppercase ${STATUS_COLORS[event.status]}`}>
                    {event.status}
                  </span>
                </div>
                {event.description && (
                  <p className="mt-2 text-sm leading-5 text-zinc-400">{event.description}</p>
                )}
                {event.status !== "approved" && (
                  <button
                    onClick={() => void advanceStatus(event)}
                    className="mt-3 text-xs text-emerald-400 hover:text-emerald-300"
                  >
                    {event.status === "draft" ? "Send to review" : "Approve event"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
