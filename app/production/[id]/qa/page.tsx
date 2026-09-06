"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/firebase/AuthProvider";
import { listProductionJobs, listQualityReviews, saveProductionJob, saveQualityReview } from "@/lib/production/repository";
import type { ProductionQueueJob, QualityReview } from "@/types/production";

const CHECKS: [keyof QualityReview & ("continuity" | "visualQuality" | "audioQuality" | "rightsCleared"), string][] = [
  ["continuity", "Story continuity"],
  ["visualQuality", "Visual quality"],
  ["audioQuality", "Audio quality"],
  ["rightsCleared", "Rights cleared"],
];

export default function QaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: productionId } = use(params);
  const { uid, status } = useAuth();
  const [jobs, setJobs] = useState<ProductionQueueJob[]>([]);
  const [reviews, setReviews] = useState<QualityReview[]>([]);

  const load = useCallback(async () => {
    if (status !== "allowed") return;
    const [j, r] = await Promise.all([
      listProductionJobs(uid, productionId),
      listQualityReviews(uid, productionId),
    ]);
    setJobs(j.filter((v) => v.outputUrls.length || v.status === "review" || v.status === "approved"));
    setReviews(r);
  }, [productionId, status, uid]);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  function reviewFor(jobId: string) {
    return reviews.find((r) => r.jobId === jobId);
  }

  async function start(job: ProductionQueueJob) {
    const r = await saveQualityReview(uid, productionId, {
      jobId: job.id,
      title: job.title,
      continuity: false,
      visualQuality: false,
      audioQuality: job.assetType !== "audio" && job.assetType !== "voice",
      rightsCleared: false,
      notes: "",
      status: "pending",
    });
    setReviews((x) => [r, ...x]);
  }

  async function toggle(r: QualityReview, key: "continuity" | "visualQuality" | "audioQuality" | "rightsCleared") {
    const saved = await saveQualityReview(uid, productionId, { ...r, [key]: !r[key] });
    setReviews((x) => x.map((v) => (v.id === r.id ? saved : v)));
  }

  async function decide(job: ProductionQueueJob, r: QualityReview, approved: boolean) {
    if (approved && !(r.continuity && r.visualQuality && r.audioQuality && r.rightsCleared)) return;
    const saved = await saveQualityReview(uid, productionId, {
      ...r,
      status: approved ? "approved" : "changes_requested",
    });
    await saveProductionJob(uid, productionId, {
      ...job,
      status: approved ? "approved" : "failed",
      error: approved ? null : "Changes requested in Quality Review.",
    });
    setReviews((x) => x.map((v) => (v.id === r.id ? saved : v)));
    setJobs((x) => x.map((v) => (v.id === job.id ? { ...v, status: approved ? "approved" : "failed" } : v)));
  }

  return (
    <main className="p-8">
      <div className="mx-auto max-w-6xl">
        <div>
          <p className="text-[10px] uppercase tracking-[.28em] text-emerald-300/70">Final Gate</p>
          <h1 className="mt-2 text-2xl font-semibold text-white">Quality Review</h1>
          <p className="mt-2 text-sm text-slate-400">
            Nothing becomes final until continuity, quality, audio, and rights checks pass.
          </p>
        </div>

        <section className="mt-8 space-y-4">
          {jobs.map((job) => {
            const r = reviewFor(job.id);
            return (
              <article key={job.id} className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
                <div className="flex justify-between">
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-slate-600">
                      {job.provider} • {job.assetType}
                    </p>
                    <h2 className="mt-1 font-semibold text-white">{job.title}</h2>
                  </div>
                  <span className="text-[10px] uppercase text-emerald-300">{r?.status ?? "not reviewed"}</span>
                </div>

                {!r ? (
                  <button onClick={() => void start(job)} className="mt-4 text-xs text-cyan-300">
                    Start quality review
                  </button>
                ) : (
                  <>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {CHECKS.map(([key, label]) => (
                        <button
                          key={key}
                          onClick={() => void toggle(r, key)}
                          className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                            r[key]
                              ? "border-emerald-300/25 bg-emerald-300/5 text-emerald-300"
                              : "border-white/10 text-slate-500 hover:border-white/20"
                          }`}
                        >
                          {r[key] ? "✓" : "○"} {label}
                        </button>
                      ))}
                    </div>
                    {r.status === "pending" && (
                      <div className="mt-4 flex gap-4 text-xs">
                        <button
                          onClick={() => void decide(job, r, true)}
                          disabled={!(r.continuity && r.visualQuality && r.audioQuality && r.rightsCleared)}
                          className="text-emerald-300 disabled:opacity-30"
                        >
                          Approve final
                        </button>
                        <button onClick={() => void decide(job, r, false)} className="text-red-300">
                          Request changes
                        </button>
                      </div>
                    )}
                  </>
                )}
              </article>
            );
          })}

          {!jobs.length && (
            <p className="rounded-2xl border border-dashed border-white/10 py-16 text-center text-sm text-slate-500">
              Generated outputs will appear here for final review.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
