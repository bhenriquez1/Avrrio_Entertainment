"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/firebase/AuthProvider";
import { listCanon, saveCanonRecord } from "@/lib/production/repository";
import { CanonCard } from "@/components/canon/CanonCard";
import type { CanonRecord, CanonType } from "@/types/canon";
import type { CanonExtractProposal, ContinuityReviewResult } from "@/types/ai";

type Tab = "approved" | "pending" | "import";

export default function CanonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: productionId } = use(params);
  const { uid, status } = useAuth();
  const [canon, setCanon] = useState<CanonRecord[]>([]);
  const [tab, setTab] = useState<Tab>("pending");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Import flow state
  const [docText, setDocText] = useState("");
  const [importing, setImporting] = useState(false);
  const [proposals, setProposals] = useState<CanonExtractProposal[]>([]);
  const [review, setReview] = useState<ContinuityReviewResult | null>(null);
  const [importStep, setImportStep] = useState<"input" | "extracting" | "reviewing" | "results">("input");
  const [importError, setImportError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (status !== "allowed") return;
    const list = await listCanon(uid, productionId);
    setCanon(list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    setLoading(false);
  }, [uid, productionId, status]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (recordId: string) => {
    setActionLoading(true);
    const record = canon.find((c) => c.id === recordId);
    if (!record) { setActionLoading(false); return; }
    await saveCanonRecord(uid, productionId, { ...record, status: "approved", approvedBy: uid });
    await load();
    setActionLoading(false);
  };

  const handleReject = async (recordId: string) => {
    setActionLoading(true);
    const record = canon.find((c) => c.id === recordId);
    if (!record) { setActionLoading(false); return; }
    await saveCanonRecord(uid, productionId, { ...record, status: "rejected" });
    await load();
    setActionLoading(false);
  };

  const handleImport = async () => {
    if (!docText.trim()) return;
    setImporting(true);
    setImportError(null);
    setImportStep("extracting");

    try {
      const approvedCanon = canon.filter((c) => c.status === "approved");

      // Step 1: OpenAI extracts canon proposals
      const extractRes = await fetch("/api/canon/extract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          documentText: docText,
          existingCanon: approvedCanon.map((c) => ({ title: c.title, statement: c.statement })),
        }),
      });
      if (!extractRes.ok) throw new Error((await extractRes.json()).error ?? "Extraction failed");
      const extractData = await extractRes.json();
      const extracted: CanonExtractProposal[] = extractData.result.proposals ?? [];
      setProposals(extracted);
      setImportStep("reviewing");

      // Step 2: Claude independently reviews for continuity
      const reviewRes = await fetch("/api/canon/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ proposals: extracted, approvedCanon }),
      });
      if (!reviewRes.ok) throw new Error((await reviewRes.json()).error ?? "Review failed");
      const reviewData = await reviewRes.json();
      setReview(reviewData.result);
      setImportStep("results");

      // Save all proposals as "proposed" canon records
      for (const p of extracted) {
        const contradictions = (reviewData.result.contradictions ?? [])
          .filter((c: { proposedTitle: string }) => c.proposedTitle === p.title)
          .map((c: { issue: string }) => c.issue);
        const reviewNote = (reviewData.result.confirmed ?? [])
          .find((c: { proposedTitle: string }) => c.proposedTitle === p.title)?.note ?? "";

        await saveCanonRecord(uid, productionId, {
          productionId,
          type: (p.type as CanonType) ?? "world_detail",
          title: p.title,
          statement: p.statement,
          status: "proposed",
          source: "Story Bible import",
          proposedBy: "openai",
          approvedBy: null,
          canonVersion: "1.0",
          supersedes: null,
          dependencies: [],
          reviewNote,
          contradictions,
        });
      }
      await load();
      setTab("pending");
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed");
      setImportStep("input");
    } finally {
      setImporting(false);
    }
  };

  const approved = canon.filter((c) => c.status === "approved");
  const pending = canon.filter((c) => c.status === "proposed");

  return (
    <main className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-50">Canon</h1>
          <p className="text-xs text-zinc-500 mt-0.5">{approved.length} approved · {pending.length} pending review</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-zinc-800 mb-6">
        {(["pending", "approved", "import"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 -mb-px ${
              tab === t ? "border-zinc-100 text-zinc-100" : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t === "pending" ? `Pending (${pending.length})` : t === "approved" ? `Approved (${approved.length})` : "Import Document"}
          </button>
        ))}
      </div>

      {tab === "import" && (
        <div className="space-y-4">
          {importStep === "input" && (
            <>
              <p className="text-sm text-zinc-400">
                Paste story document text. OpenAI will extract canon proposals, then Claude will independently review for contradictions. You approve or reject each fact.
              </p>
              <textarea
                value={docText}
                onChange={(e) => setDocText(e.target.value)}
                rows={12}
                placeholder="Paste your story bible, character sheets, world-building notes, or any document text here…"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none resize-none font-mono"
              />
              {importError && <p className="text-sm text-red-400">{importError}</p>}
              <button
                disabled={!docText.trim() || importing}
                onClick={handleImport}
                className="rounded-lg bg-zinc-100 px-5 py-2 text-sm font-semibold text-zinc-900 hover:bg-white disabled:opacity-40 transition-colors"
              >
                Extract Canon
              </button>
            </>
          )}
          {importStep === "extracting" && (
            <div className="space-y-3 py-8 text-center">
              <div className="text-2xl">◌</div>
              <p className="text-sm font-semibold text-zinc-300">OpenAI — Extracting canon proposals…</p>
              <p className="text-xs text-zinc-500">Analyzing document for canonical facts</p>
            </div>
          )}
          {importStep === "reviewing" && (
            <div className="space-y-3 py-8 text-center">
              <div className="text-2xl">◌</div>
              <p className="text-sm font-semibold text-zinc-300">Claude — Independent continuity review…</p>
              <p className="text-xs text-zinc-500">{proposals.length} proposals being verified against {canon.filter(c => c.status === "approved").length} approved canon records</p>
            </div>
          )}
          {importStep === "results" && review && (
            <div className="space-y-4">
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Claude — Continuity Review Summary</p>
                <p className="text-sm text-zinc-300">{review.summary}</p>
                {review.contradictions.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {review.contradictions.map((c, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <span className={c.severity === "critical" ? "text-red-400" : c.severity === "moderate" ? "text-amber-400" : "text-zinc-400"}>
                          {c.severity === "critical" ? "⛔" : c.severity === "moderate" ? "⚠" : "◦"}
                        </span>
                        <div>
                          <span className="font-medium text-zinc-300">{c.proposedTitle}</span>
                          <span className="text-zinc-500"> — {c.issue}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-sm text-zinc-400">{proposals.length} proposals saved for your review. Go to the <button onClick={() => setTab("pending")} className="text-zinc-200 underline">Pending tab</button> to approve or reject each one.</p>
            </div>
          )}
        </div>
      )}

      {tab === "pending" && (
        <div className="space-y-3">
          {loading ? (
            <p className="text-sm text-zinc-500">Loading…</p>
          ) : pending.length === 0 ? (
            <div className="rounded-lg border border-zinc-800 p-6 text-center">
              <p className="text-sm text-zinc-500">No pending canon records.</p>
              <button onClick={() => setTab("import")} className="mt-2 text-xs text-zinc-400 underline hover:text-zinc-200">
                Import a document to extract canon
              </button>
            </div>
          ) : (
            pending.map((record) => (
              <CanonCard
                key={record.id}
                record={record}
                onApprove={handleApprove}
                onReject={handleReject}
                loading={actionLoading}
              />
            ))
          )}
        </div>
      )}

      {tab === "approved" && (
        <div className="space-y-3">
          {approved.length === 0 ? (
            <p className="text-sm text-zinc-500">No approved canon yet.</p>
          ) : (
            approved.map((record) => (
              <CanonCard key={record.id} record={record} />
            ))
          )}
        </div>
      )}
    </main>
  );
}
