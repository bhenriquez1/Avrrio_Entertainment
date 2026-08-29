import type { CanonStatus } from "@/types/canon";

const COLORS: Record<CanonStatus, string> = {
  proposed: "bg-amber-500/15 text-amber-400",
  approved: "bg-emerald-500/15 text-emerald-400",
  rejected: "bg-red-500/15 text-red-400",
  superseded: "bg-zinc-700 text-zinc-400",
};

export function CanonStatusBadge({ status }: { status: CanonStatus }) {
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${COLORS[status]}`}>
      {status}
    </span>
  );
}
