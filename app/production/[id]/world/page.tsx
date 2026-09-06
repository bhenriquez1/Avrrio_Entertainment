"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/firebase/AuthProvider";
import { listCanon, saveCanonRecord } from "@/lib/production/repository";
import type { CanonRecord, CanonType } from "@/types/canon";

const WORLD_SECTIONS = [
  { label: "Locations", types: ["location"] as CanonType[], icon: "◈" },
  { label: "Organizations", types: ["organization"] as CanonType[], icon: "◻" },
  { label: "Artifacts", types: ["artifact"] as CanonType[], icon: "◆" },
  { label: "Species", types: ["species"] as CanonType[], icon: "◎" },
  { label: "World Details", types: ["world_detail"] as CanonType[], icon: "·" },
];

const WORLD_TYPES: { value: CanonType; label: string }[] = [
  { value: "location", label: "Location" },
  { value: "organization", label: "Organization" },
  { value: "artifact", label: "Artifact" },
  { value: "species", label: "Species" },
  { value: "world_detail", label: "World Detail" },
];

const WORLD_TYPE_SET = new Set(WORLD_SECTIONS.flatMap((s) => s.types));

const EMPTY_FORM = { type: "location" as CanonType, title: "", statement: "" };

export default function WorldPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: productionId } = use(params);
  const { uid, status } = useAuth();
  const [canon, setCanon] = useState<CanonRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (status !== "allowed") return;
    const all = await listCanon(uid, productionId);
    setCanon(all.filter((r) => r.status === "approved" && WORLD_TYPE_SET.has(r.type)));
    setLoading(false);
  }, [uid, productionId, status]);

  useEffect(() => { void load(); }, [load]);

  async function propose(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.statement.trim()) return;
    setSaving(true);
    await saveCanonRecord(uid, productionId, {
      productionId,
      type: form.type,
      title: form.title.trim(),
      statement: form.statement.trim(),
      status: "proposed",
      source: "World page",
      proposedBy: "user",
      approvedBy: null,
      canonVersion: "1.0",
      supersedes: null,
      dependencies: [],
      reviewNote: "",
      contradictions: [],
    });
    setForm(EMPTY_FORM);
    setShowForm(false);
    await load();
    setSaving(false);
  }

  const total = canon.length;

  const filtered = search
    ? canon.filter((r) => {
        const q = search.toLowerCase();
        return r.title.toLowerCase().includes(q) || r.statement.toLowerCase().includes(q);
      })
    : canon;

  return (
    <main className="p-8 max-w-3xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Story Development</p>
          <h1 className="mt-1 text-xl font-bold text-zinc-50">World</h1>
          <p className="mt-0.5 text-xs text-zinc-500">
            {total} approved world records
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-lg bg-amber-300 px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-amber-200 transition-colors"
          >
            {showForm ? "Cancel" : "+ Propose"}
          </button>
          <Link
            href={`/production/${productionId}/story-bible/import`}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            Import Document
          </Link>
        </div>
      </div>

      {showForm && (
        <form onSubmit={(e) => void propose(e)} className="mb-6 rounded-xl border border-zinc-700 bg-zinc-900 p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Propose World Record</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as CanonType }))}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/50"
              >
                {WORLD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-1">Title *</label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Name or title"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/50 placeholder:text-zinc-600"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-1">Statement *</label>
            <textarea
              required
              rows={3}
              value={form.statement}
              onChange={(e) => setForm((f) => ({ ...f, statement: e.target.value }))}
              placeholder="Describe this world element…"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/50 placeholder:text-zinc-600 resize-none"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving || !form.title.trim() || !form.statement.trim()}
              className="rounded-lg bg-amber-300 px-5 py-2 text-xs font-bold text-zinc-950 hover:bg-amber-200 disabled:opacity-40 transition-colors"
            >
              {saving ? "Saving…" : "Propose to Canon"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-400 hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : total === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-10 text-center">
          <p className="text-sm text-zinc-400">No world-building canon yet.</p>
          <p className="mt-2 text-xs leading-5 text-zinc-600">
            Use the{" "}
            <Link href={`/production/${productionId}/creative-room`} className="underline hover:text-zinc-400">
              Creative Room
            </Link>{" "}
            to develop locations and lore, or{" "}
            <Link href={`/production/${productionId}/story-bible/import`} className="underline hover:text-zinc-400">
              import a document
            </Link>{" "}
            containing world details. Proposed records appear in{" "}
            <Link href={`/production/${productionId}/canon`} className="underline hover:text-zinc-400">
              Canon → Pending
            </Link>{" "}
            for your approval.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {total > 4 && (
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search world records…"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-600"
            />
          )}
          {WORLD_SECTIONS.map((section) => {
            const records = filtered.filter((r) => (section.types as string[]).includes(r.type));
            if (records.length === 0) return null;
            return (
              <div key={section.label}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-zinc-500">{section.icon}</span>
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">{section.label}</h2>
                  <span className="text-xs text-zinc-600">({records.length})</span>
                </div>
                <div className="space-y-2">
                  {records.map((record) => (
                    <div key={record.id} className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
                      <p className="text-sm font-semibold text-zinc-100">{record.title}</p>
                      <p className="mt-0.5 text-sm text-zinc-400 leading-5">{record.statement}</p>
                      {record.reviewNote && (
                        <p className="mt-1 text-xs text-zinc-600 italic">{record.reviewNote}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && search && (
            <p className="text-sm text-zinc-500">No world records match your search.</p>
          )}
          <div className="pt-4 border-t border-zinc-800 flex gap-3">
            <Link
              href={`/production/${productionId}/creative-room`}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              Develop in Creative Room
            </Link>
            <Link
              href={`/production/${productionId}/canon`}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              Review pending canon
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
