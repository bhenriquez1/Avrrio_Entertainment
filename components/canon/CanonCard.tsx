"use client";

import { useState } from "react";
import { CanonStatusBadge } from "./CanonStatusBadge";
import { CANON_TYPE_LABELS } from "@/types/canon";
import type { CanonRecord } from "@/types/canon";

interface CanonCardProps {
  record: CanonRecord;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onEdit?: (id: string, statement: string) => Promise<void>;
  loading?: boolean;
}

export function CanonCard({ record, onApprove, onReject, onEdit, loading }: CanonCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(record.statement);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!onEdit || draft.trim() === record.statement) { setEditing(false); return; }
    setSaving(true);
    await onEdit(record.id, draft.trim());
    setSaving(false);
    setEditing(false);
  }

  function cancel() {
    setDraft(record.statement);
    setEditing(false);
  }

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
          {editing ? (
            <div className="mt-2 space-y-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/50"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => void save()}
                  disabled={saving || !draft.trim()}
                  className="rounded bg-amber-300 px-3 py-1 text-xs font-bold text-zinc-950 hover:bg-amber-200 disabled:opacity-40 transition-colors"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={cancel}
                  className="rounded bg-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p
              className={`mt-1 text-sm text-zinc-300 ${onEdit && record.status === "approved" ? "cursor-text hover:text-zinc-100 transition-colors" : ""}`}
              onClick={() => { if (onEdit && record.status === "approved") { setEditing(true); } }}
              title={onEdit && record.status === "approved" ? "Click to edit" : undefined}
            >
              {record.statement}
            </p>
          )}
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
