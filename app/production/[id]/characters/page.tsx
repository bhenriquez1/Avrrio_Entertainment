"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/firebase/AuthProvider";
import { listCanon, saveCanonRecord } from "@/lib/production/repository";
import type { CanonRecord } from "@/types/canon";

const EMPTY_CHAR_FORM = { name: "", age: "", role: "", statement: "" };

const CASTILLO_STUBS: Array<{ name: string; statement: string }> = [
  { name: "Samantha", statement: "Samantha is a principal character in Castillo. Age: 16. Additional details to be developed and approved." },
  { name: "Arianna", statement: "Arianna is a principal character in Castillo. Age: 16. Additional details to be developed and approved." },
  { name: "Joshua", statement: "Joshua is a principal character in Castillo. Additional details to be developed and approved." },
  { name: "Ismael", statement: "Ismael is a principal character in Castillo. Additional details to be developed and approved." },
  { name: "Brian", statement: "Brian is a principal character in Castillo. Additional details to be developed and approved." },
  { name: "Mackenzie", statement: "Mackenzie is a principal character in Castillo. Additional details to be developed and approved." },
];

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function avatarColor(name: string) {
  const colors = [
    "from-amber-600 to-amber-800",
    "from-blue-600 to-blue-800",
    "from-emerald-600 to-emerald-800",
    "from-purple-600 to-purple-800",
    "from-rose-600 to-rose-800",
    "from-cyan-600 to-cyan-800",
  ];
  const i = name.charCodeAt(0) % colors.length;
  return colors[i];
}

function statusBadge(status: CanonRecord["status"]) {
  switch (status) {
    case "approved": return "text-emerald-400 border-emerald-900/40 bg-emerald-950/20";
    case "proposed": return "text-amber-400 border-amber-900/40 bg-amber-950/20";
    case "rejected": return "text-red-400 border-red-900/40 bg-red-950/20";
    default: return "text-zinc-500 border-zinc-800";
  }
}

export default function CharactersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: productionId } = use(params);
  const { uid, status } = useAuth();
  const [characters, setCharacters] = useState<CanonRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [charForm, setCharForm] = useState(EMPTY_CHAR_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (status !== "allowed") return;
    const all = await listCanon(uid, productionId);
    setCharacters(all.filter((r) => r.type === "character").sort((a, b) => a.title.localeCompare(b.title)));
    setLoading(false);
  }, [uid, productionId, status]);

  useEffect(() => { void load(); }, [load]);

  async function seedCastilloCharacters() {
    setSeeding(true);
    const existing = new Set(characters.map((c) => c.title.toLowerCase()));
    for (const stub of CASTILLO_STUBS) {
      if (existing.has(stub.name.toLowerCase())) continue;
      await saveCanonRecord(uid, productionId, {
        productionId,
        type: "character",
        title: stub.name,
        statement: stub.statement,
        status: "proposed",
        source: "Castillo principal cast — placeholder",
        proposedBy: "user",
        approvedBy: null,
        canonVersion: "1.0",
        supersedes: null,
        dependencies: [],
        reviewNote: "Stub entity. Develop in the Creative Room and approve canon facts as they are confirmed.",
        contradictions: [],
      });
    }
    await load();
    setSeeding(false);
  }

  async function createCharacter(e: React.FormEvent) {
    e.preventDefault();
    if (!charForm.name.trim()) return;
    setSaving(true);
    const agePart = charForm.age.trim() ? ` Age: ${charForm.age.trim()}.` : "";
    const rolePart = charForm.role.trim() ? ` Role: ${charForm.role.trim()}.` : "";
    const extra = charForm.statement.trim() ? ` ${charForm.statement.trim()}` : "";
    const statement = `${charForm.name.trim()} is a character in this production.${agePart}${rolePart}${extra}`;
    await saveCanonRecord(uid, productionId, {
      productionId,
      type: "character",
      title: charForm.name.trim(),
      statement,
      status: "proposed",
      source: "Characters page",
      proposedBy: "user",
      approvedBy: null,
      canonVersion: "1.0",
      supersedes: null,
      dependencies: [],
      reviewNote: "",
      contradictions: [],
    });
    setCharForm(EMPTY_CHAR_FORM);
    setShowForm(false);
    await load();
    setSaving(false);
  }

  const approved = characters.filter((c) => c.status === "approved");
  const proposed = characters.filter((c) => c.status === "proposed");
  const needsSeed = CASTILLO_STUBS.some((s) => !characters.find((c) => c.title.toLowerCase() === s.name.toLowerCase()));

  if (loading) return <div className="p-8 text-sm text-zinc-500">Loading…</div>;

  return (
    <main className="p-8 max-w-4xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Story Development</p>
          <h1 className="mt-1 text-xl font-bold text-zinc-50">Characters</h1>
          <p className="mt-0.5 text-xs text-zinc-500">
            {approved.length} approved · {proposed.length} proposed
          </p>
        </div>
        <div className="flex gap-2">
          {needsSeed && (
            <button
              onClick={() => void seedCastilloCharacters()}
              disabled={seeding}
              className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 disabled:opacity-40 transition-colors"
            >
              {seeding ? "Seeding…" : "Seed Castillo Characters"}
            </button>
          )}
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-lg bg-amber-300 px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-amber-200 transition-colors"
          >
            {showForm ? "Cancel" : "+ New Character"}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={(e) => void createCharacter(e)} className="mb-6 rounded-xl border border-zinc-700 bg-zinc-900 p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-1">New Character (proposed)</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-1">Name *</label>
              <input
                required
                value={charForm.name}
                onChange={(e) => setCharForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Samantha"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/50 placeholder:text-zinc-600"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-1">Age</label>
              <input
                value={charForm.age}
                onChange={(e) => setCharForm((f) => ({ ...f, age: e.target.value }))}
                placeholder="16"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/50 placeholder:text-zinc-600"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-1">Role / Title</label>
            <input
              value={charForm.role}
              onChange={(e) => setCharForm((f) => ({ ...f, role: e.target.value }))}
              placeholder="Protagonist, best friend…"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/50 placeholder:text-zinc-600"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-1">Notes</label>
            <textarea
              rows={2}
              value={charForm.statement}
              onChange={(e) => setCharForm((f) => ({ ...f, statement: e.target.value }))}
              placeholder="Brief description, key traits…"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/50 placeholder:text-zinc-600 resize-none"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving || !charForm.name.trim()}
              className="rounded-lg bg-amber-300 px-5 py-2 text-xs font-bold text-zinc-950 hover:bg-amber-200 disabled:opacity-40 transition-colors"
            >
              {saving ? "Saving…" : "Propose Character"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setCharForm(EMPTY_CHAR_FORM); }}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-400 hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {characters.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-10 text-center">
          <p className="text-sm text-zinc-400">No character entities yet.</p>
          <p className="mt-2 text-xs text-zinc-600">
            Seed the Castillo principal cast, or develop characters in the{" "}
            <Link href={`/production/${productionId}/creative-room`} className="underline hover:text-zinc-400">
              Creative Room
            </Link>{" "}
            and propose them to canon.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {characters.map((char) => (
            <Link
              key={char.id}
              href={`/production/${productionId}/characters/${char.id}`}
              className="group rounded-xl border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-700 hover:bg-zinc-800/60 transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${avatarColor(char.title)} text-sm font-bold text-white`}>
                  {initials(char.title)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-zinc-100 group-hover:text-white">{char.title}</p>
                  <span className={`inline-block mt-0.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${statusBadge(char.status)}`}>
                    {char.status}
                  </span>
                </div>
              </div>
              <p className="text-xs text-zinc-500 leading-5 line-clamp-2">{char.statement}</p>
              <p className="mt-3 text-[10px] text-zinc-700 group-hover:text-zinc-500 transition-colors">View profile →</p>
            </Link>
          ))}
        </div>
      )}

      {proposed.length > 0 && (
        <p className="mt-6 text-xs text-zinc-600">
          Proposed characters await approval in{" "}
          <Link href={`/production/${productionId}/canon`} className="text-zinc-400 underline hover:text-zinc-200">
            Canon → Pending
          </Link>.
        </p>
      )}
    </main>
  );
}
