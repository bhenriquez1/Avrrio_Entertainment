import type { AssetStatus } from "@/types/brand";
import { ASSET_STATUS_LABELS } from "@/types/brand";

const COLORS: Record<AssetStatus, string> = {
  concept: "border-zinc-700 text-zinc-400",
  "in-development": "border-amber-700/50 text-amber-400",
  approved: "border-sky-700/50 text-sky-400",
  final: "border-emerald-700/50 text-emerald-400",
};

export function AssetStatusBadge({ status }: { status: AssetStatus }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${COLORS[status]}`}>
      {ASSET_STATUS_LABELS[status]}
    </span>
  );
}
