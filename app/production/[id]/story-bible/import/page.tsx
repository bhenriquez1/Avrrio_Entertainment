"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/firebase/AuthProvider";
import { listCanon, saveCanonRecord } from "@/lib/production/repository";
import type { CanonRecord, CanonType } from "@/types/canon";
import Link from "next/link";

type ImportCategory =
  | "character"
  | "relationship"
  | "timeline_event"
  | "power_rule"
  | "location"
  | "secret"
  | "foreshadowing"
  | "idea"
  | "canon_decision"
  | "season_episode";

interface ImportRecord {
  category: ImportCategory;
  title: string;
  statement: string;
  confidence: "high" | "medium" | "low";
  source_passage: string;
  notes?: string;
}

interface ImportResult {
  records: ImportRecord[];
  summary: string;
}

type ItemDecision = "approve" | "idea" | "reject" | "pending";

interface ReviewItem {
  record: ImportRecord;
  decision: ItemDecision;
  editedStatement: string;
  editing: boolean;
  saved: boolean;
}

const CATEGORY_LABELS: Record<ImportCategory, string> = {
  character: "Character",
  relationship: "Relationship",
  timeline_event: "Timeline Event",
  power_rule: "Power / Rule",
  location: "Location",
  secret: "Secret",
  foreshadowing: "Foreshadowing",
  idea: "Idea",
  canon_decision: "Canon Decision",
  season_episode: "Season / Episode",
};

const CANON_TYPE_MAP: Record<ImportCategory, CanonType> = {
  character: "character",
  relationship: "relationship",
  timeline_event: "historical_event",
  power_rule: "rule",
  location: "location",
  secret: "world_detail",
  foreshadowing: "world_detail",
  idea: "world_detail",
  canon_decision: "world_detail",
  season_episode: "world_detail",
};

const CONFIDENCE_COLOR: Record<string, string> = {
  high: "text-emerald-400",
  medium: "text-amber-400",
  low: "text-zinc-500",
};

const CATEGORY_COLOR: Record<ImportCategory, string> = {
  character: "border-blue-800/50 bg-blue-950/20",
  relationship: "border-purple-800/50 bg-purple-950/20",
  timeline_event: "border-orange-800/50 bg-orange-950/20",
  power_rule: "border-cyan-800/50 bg-cyan-950/20",
  location: "border-green-800/50 bg-green-950/20",
  secret: "border-red-800/50 bg-red-950/20",
  foreshadowing: "border-yellow-800/50 bg-yellow-950/20",
  idea: "border-zinc-700 bg-zinc-900/50",
  canon_decision: "border-emerald-800/50 bg-emerald-950/20",
  season_episode: "border-indigo-800/50 bg-indigo-950/20",
};

export default function StoryImportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: productionId } = use(params);
  const { uid, status, getIdToken } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [docText, setDocText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [approvedCanon, setApprovedCanon] = useState<CanonRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const loadCanon = useCallback(async () => {
    if (status !== "allowed") return;
    const all = await listCanon(uid, productionId);
    setApprovedCanon(all.filter((r) => r.status === "approved"));
  }, [uid, productionId, status]);

  useEffect(() => { void loadCanon(); }, [loadCanon]);

  function handleFile(file: File) {
    if (!file.type.startsWith("text/") && !file.name.endsWith(".txt") && !file.name.endsWith(".md")) {
      setError("Only plain text (.txt) or Markdown (.md) files are supported.");
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => setDocText((e.target?.result as string) ?? "");
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  async function analyze() {
    if (!docText.trim() || analyzing) return;
    setAnalyzing(true);
    setError(null);
    setResult(null);
    setItems([]);
    setDone(false);

    try {
      const token = await getIdToken();
      const res = await fetch("/api/story-import/analyze", {
        method: "POST",
        headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          documentText: docText.trim(),
          existingCanon: approvedCanon.map(({ title, statement }) => ({ title, statement })),
        }),
      });
      const data = await res.json() as { result: ImportResult; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Analysis failed.");
      setResult(data.result);
      setItems(
        (data.result.records ?? []).map((record) => ({
          record,
          decision: "pending" as ItemDecision,
          editedStatement: record.statement,
          editing: false,
          saved: false,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setAnalyzing(false);
    }
  }

  function decide(index: number, decision: ItemDecision) {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, decision } : item));
  }

  function toggleEdit(index: number) {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, editing: !item.editing } : item));
  }

  function updateStatement(index: number, value: string) {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, editedStatement: value } : item));
  }

  async function saveAll() {
    setSaving(true);
    const toSave = items.filter((item) => item.decision === "approve" || item.decision === "idea");
    for (const item of toSave) {
      await saveCanonRecord(uid, productionId, {
        productionId,
        type: CANON_TYPE_MAP[item.record.category],
        title: item.record.title,
        statement: item.editedStatement,
        status: "proposed",
        source: `Story Development Import${fileName ? ` — ${fileName}` : ""}`,
        proposedBy: "openai",
        approvedBy: null,
        canonVersion: "1.0",
        supersedes: null,
        dependencies: [],
        reviewNote: item.decision === "idea"
          ? "Saved as a creative idea — not a formal canon proposal."
          : `Category: ${CATEGORY_LABELS[item.record.category]}. Confidence: ${item.record.confidence}. Source: "${item.record.source_passage.slice(0, 120)}${item.record.source_passage.length > 120 ? "…" : ""}"`,
        contradictions: [],
      });
    }
    setSaving(false);
    setDone(true);
  }

  const pending = items.filter((item) => item.decision === "pending").length;
  const approved = items.filter((item) => item.decision === "approve").length;
  const ideas = items.filter((item) => item.decision === "idea").length;
  const rejected = items.filter((item) => item.decision === "reject").length;

  if (done) {
    return (
      <main className="p-8 max-w-2xl">
        <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-8 text-center">
          <p className="text-2xl">✓</p>
          <h2 className="mt-2 text-lg font-bold text-emerald-300">Import complete</h2>
          <p className="mt-2 text-sm text-zinc-400">
            {approved} canon proposals + {ideas} ideas saved to{" "}
            <Link href={`/production/${productionId}/canon`} className="text-zinc-200 underline">Canon → Pending</Link> for your review.
            {rejected > 0 && ` ${rejected} records were discarded.`}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href={`/production/${productionId}/canon`} className="rounded-lg bg-zinc-100 px-5 py-2 text-sm font-semibold text-zinc-900 hover:bg-white transition-colors">
              Review Pending Canon
            </Link>
            <button onClick={() => { setDone(false); setResult(null); setItems([]); setDocText(""); setFileName(null); }} className="rounded-lg border border-zinc-700 px-5 py-2 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors">
              Import Another
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="p-8 max-w-3xl">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Story Development</p>
        <h1 className="mt-1 text-xl font-bold text-zinc-50">Import Document</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Paste story notes or upload a text file. OpenAI will extract structured records across {Object.keys(CATEGORY_LABELS).length} categories.
          You review each one before anything touches your canon.
        </p>
      </div>

      {!result && (
        <div className="space-y-4">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900/50 p-6 text-center transition-colors hover:border-zinc-500"
          >
            <p className="text-sm text-zinc-400">Drop a .txt or .md file here, or</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 text-xs font-semibold text-amber-300 underline hover:text-amber-200"
            >
              browse to upload
            </button>
            {fileName && <p className="mt-2 text-xs text-emerald-400">✓ {fileName}</p>}
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,text/plain,text/markdown"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-800" />
            <span className="text-xs text-zinc-600">or paste text</span>
            <div className="h-px flex-1 bg-zinc-800" />
          </div>

          <textarea
            value={docText}
            onChange={(e) => { setDocText(e.target.value); if (e.target.value) setFileName(null); }}
            rows={12}
            placeholder="Paste your story notes, ChatGPT conversation, character sheets, world-building notes, or any development text…"
            className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none font-mono"
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-600">{approvedCanon.length} approved canon records will be used to filter duplicates.</p>
            <button
              disabled={!docText.trim() || analyzing}
              onClick={() => void analyze()}
              className="rounded-lg bg-amber-300 px-6 py-2 text-sm font-bold text-zinc-950 hover:bg-amber-200 disabled:opacity-40 transition-colors"
            >
              {analyzing ? "Analyzing…" : "Analyze Document"}
            </button>
          </div>

          {analyzing && (
            <div className="py-6 text-center">
              <p className="text-sm font-semibold text-zinc-300 animate-pulse">OpenAI — Reading document…</p>
              <p className="mt-1 text-xs text-zinc-600">Extracting characters, relationships, timeline, powers, locations, secrets, and more.</p>
            </div>
          )}
        </div>
      )}

      {result && items.length > 0 && (
        <div className="space-y-6">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">Document Summary</p>
            <p className="text-sm text-zinc-300">{result.summary}</p>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-zinc-500">
              <span>{items.length} records found</span>
              <span className="text-amber-400">{pending} pending</span>
              <span className="text-emerald-400">{approved} approved</span>
              <span className="text-blue-400">{ideas} saved as idea</span>
              <span className="text-red-400">{rejected} rejected</span>
            </div>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className={`rounded-xl border p-4 transition-opacity ${item.decision === "reject" ? "opacity-40" : ""} ${CATEGORY_COLOR[item.record.category]}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        {CATEGORY_LABELS[item.record.category]}
                      </span>
                      <span className={`text-[10px] font-semibold ${CONFIDENCE_COLOR[item.record.confidence]}`}>
                        {item.record.confidence} confidence
                      </span>
                    </div>
                    <h3 className="mt-1 text-sm font-semibold text-zinc-100">{item.record.title}</h3>

                    {item.editing ? (
                      <textarea
                        value={item.editedStatement}
                        onChange={(e) => updateStatement(index, e.target.value)}
                        rows={3}
                        className="mt-2 w-full resize-none rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-amber-400/50 focus:outline-none"
                      />
                    ) : (
                      <p className="mt-1 text-sm text-zinc-300 leading-5">{item.editedStatement}</p>
                    )}

                    {item.record.source_passage && (
                      <p className="mt-2 text-xs text-zinc-600 italic line-clamp-2">
                        "{item.record.source_passage}"
                      </p>
                    )}
                    {item.record.notes && (
                      <p className="mt-1 text-xs text-amber-500">Note: {item.record.notes}</p>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {item.decision === "pending" || item.decision === "approve" ? (
                    <button
                      onClick={() => decide(index, item.decision === "approve" ? "pending" : "approve")}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${item.decision === "approve" ? "border-emerald-600 bg-emerald-900/40 text-emerald-300" : "border-zinc-700 text-zinc-400 hover:border-emerald-700 hover:text-emerald-400"}`}
                    >
                      {item.decision === "approve" ? "✓ Approved for review" : "Approve"}
                    </button>
                  ) : null}

                  <button
                    onClick={() => toggleEdit(index)}
                    className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    {item.editing ? "Done editing" : "Edit"}
                  </button>

                  {item.decision === "pending" || item.decision === "idea" ? (
                    <button
                      onClick={() => decide(index, item.decision === "idea" ? "pending" : "idea")}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${item.decision === "idea" ? "border-blue-600 bg-blue-900/40 text-blue-300" : "border-zinc-700 text-zinc-400 hover:border-blue-700 hover:text-blue-400"}`}
                    >
                      {item.decision === "idea" ? "♡ Saved as Idea" : "Save as Idea"}
                    </button>
                  ) : null}

                  {item.decision !== "reject" ? (
                    <button
                      onClick={() => decide(index, "reject")}
                      className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-semibold text-zinc-500 hover:border-red-800 hover:text-red-400 transition-colors"
                    >
                      Reject
                    </button>
                  ) : (
                    <button
                      onClick={() => decide(index, "pending")}
                      className="rounded-full border border-red-800 bg-red-950/30 px-3 py-1 text-xs font-semibold text-red-400 hover:text-red-200 transition-colors"
                    >
                      ✕ Rejected — undo
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="sticky bottom-4 rounded-xl border border-zinc-700 bg-zinc-950/95 p-4 backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              <div className="text-xs text-zinc-400">
                <span className="text-emerald-400 font-semibold">{approved}</span> to review as canon proposals ·{" "}
                <span className="text-blue-400 font-semibold">{ideas}</span> ideas ·{" "}
                <span className="text-zinc-600">{rejected}</span> rejected ·{" "}
                {pending > 0 && <span className="text-amber-400">{pending} still pending</span>}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setResult(null); setItems([]); }}
                  className="rounded-lg border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Start over
                </button>
                <button
                  onClick={() => void saveAll()}
                  disabled={saving || (approved === 0 && ideas === 0)}
                  className="rounded-lg bg-zinc-100 px-5 py-2 text-xs font-semibold text-zinc-900 hover:bg-white disabled:opacity-40 transition-colors"
                >
                  {saving ? "Saving…" : `Save ${approved + ideas} records`}
                </button>
              </div>
            </div>
            {pending > 0 && (
              <p className="mt-2 text-[11px] text-zinc-600">
                {pending} record{pending !== 1 ? "s" : ""} still marked pending — you can save now and they will be skipped.
              </p>
            )}
          </div>
        </div>
      )}

      {result && items.length === 0 && (
        <div className="rounded-xl border border-zinc-800 p-8 text-center">
          <p className="text-sm text-zinc-400">No records were extracted from this document.</p>
          <button onClick={() => { setResult(null); setDocText(""); setFileName(null); }} className="mt-3 text-xs text-zinc-500 underline hover:text-zinc-300">
            Try a different document
          </button>
        </div>
      )}
    </main>
  );
}
