"use client";

import { CanonStatusBadge } from "./CanonStatusBadge";
import { CANON_TYPE_LABELS } from "@/types/canon";
import type { CanonRecord } from "@/types/canon";

interface CanonCardProps {
  record: CanonRecord;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  loading?: boolean;
}

export function CanonCard({ record, onApprove, onReject, loading }: CanonCardProps) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">
              {CANON_TYPE_LABELS[record.type] ?? record.type}
            </span>
            <CanonStatusBadge status={record.status} />
            {record.proposedBy !== "user" && (
              <span className="text-[10px] text-zinc-600 uppercase tracking-wider">
                via {record.proposedBy === "openai" ? "OpenAI" : "Claude"}
              </span>
            )}
          </div>
          <h3 className="mt-1 text-sm font-semibold text-zinc-100">{record.title}</h3>
          <p className="mt-1 text-sm text-zinc-300">{record.statement}</p>
          {record.contradictions.length > 0 && (
            <div className="mt-2 space-y-1">
              {record.contradictions.map((c, i) => (
                <p key={i} className="flex items-start gap-1.5 text-xs text-amber-400">
                  <span>⚠</span> {c}
                </p>
              ))}
            </div>
          )}
          {record.reviewNote && (
            <p className="mt-2 text-xs text-zinc-500 italic">{record.reviewNote}</p>
          )}
          <p className="mt-2 text-[10px] text-zinc-600">Source: {record.source}</p>
        </div>
        {record.status === "proposed" && onApprove && onReject && (
          <div className="flex flex-shrink-0 flex-col gap-1.5">
            <button
              disabled={loading}
              onClick={() => onApprove(record.id)}
              className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-40 transition-colors"
            >
              Approve
            </button>
            <button
              disabled={loading}
              onClick={() => onReject(record.id)}
              className="rounded bg-zinc-700 px-3 py-1 text-xs font-medium text-zinc-300 hover:bg-zinc-600 disabled:opacity-40 transition-colors"
            >
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
