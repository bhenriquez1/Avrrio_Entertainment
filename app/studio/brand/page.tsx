"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/firebase/AuthProvider";
import { getStudioBrand, updateIdentVariant, updateSonicSignature, updateBrandField } from "@/lib/brand/repository";
import { IdentAnimation } from "@/components/brand/IdentAnimation";
import { AssetStatusBadge } from "@/components/brand/AssetStatusBadge";
import type { StudioBrandPackage, AssetStatus, IdentVariant } from "@/types/brand";
import { IDENT_VARIANT_LABELS, ASSET_STATUS_LABELS, ASSET_FORMAT_LABELS } from "@/types/brand";
import Link from "next/link";

const STATUSES: AssetStatus[] = ["concept", "in-development", "approved", "final"];

const IDENT_STORYBOARD = [
  { label: "Black", icon: "◼", note: "Complete darkness. Silence." },
  { label: "Point of light", icon: "·", note: "A single tiny point appears." },
  { label: "Field of fragments", icon: "⁺⁺·", note: "Camera reveals an enormous particle field — unfinished stories." },
  { label: "Fragments become", icon: "◻ ◎ ▣", note: "Briefly: a page, an eye, a city, a character silhouette, a film frame." },
  { label: "Acceleration", icon: "→→→", note: "All fragments accelerate toward one point." },
  { label: "Assembly", icon: "⬡", note: "They assemble into the Avrrio symbol." },
  { label: "AVRRIO ENTERTAINMENT", icon: "Aa", note: "Wordmark holds. Sonic signature resolves." },
  { label: "Fade to black", icon: "◼", note: "Episode begins." },
];

export default function StudioBrandPage() {
  const { uid, status } = useAuth();
  const [brand, setBrand] = useState<StudioBrandPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [played, setPlayed] = useState(false);

  const load = useCallback(async () => {
    if (status !== "allowed") return;
    const pkg = await getStudioBrand(uid);
    setBrand(pkg);
    setLoading(false);
  }, [uid, status]);

  useEffect(() => { load(); }, [load]);

  const handleIdentStatus = async (variantId: string, newStatus: AssetStatus) => {
    if (!brand) return;
    setSaving(variantId);
    await updateIdentVariant(uid, variantId, { status: newStatus });
    await load();
    setSaving(null);
  };

  const handleSonicStatus = async (newStatus: AssetStatus) => {
    if (!brand) return;
    setSaving("sonic");
    await updateSonicSignature(uid, { status: newStatus });
    await load();
    setSaving(null);
  };

  const handleBrandField = async (field: Parameters<typeof updateBrandField>[1], value: string) => {
    if (!brand) return;
    setSaving(field);
    await updateBrandField(uid, field, value);
    await load();
    setSaving(null);
  };

  if (loading || !brand) {
    return <div className="p-8 text-sm text-zinc-500">Loading brand package…</div>;
  }

  const overallAssets: { label: string; status: AssetStatus; key: string }[] = [
    { label: "Avrrio Entertainment Logo", status: brand.logoStatus, key: "logoStatus" },
    ...brand.identVariants.map((v) => ({
      label: `Studio Ident — ${IDENT_VARIANT_LABELS[v.type]}`,
      status: v.status,
      key: v.id,
    })),
    { label: "Sonic Signature", status: brand.sonicSignature?.status ?? "concept", key: "sonic" },
    { label: "Closing Logo", status: brand.closingLogoStatus, key: "closingLogoStatus" },
  ];

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 space-y-10">
      <div>
        <Link href="/studio" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">← All Productions</Link>
        <h1 className="mt-3 text-2xl font-bold text-zinc-50">Studio Brand</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Avrrio Entertainment's canonical brand assets — ident variants, sonic signature, and production standards.
        </p>
      </div>

      {/* Asset Hierarchy */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">Studio Brand Assets</h2>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
          {overallAssets.map((a) => (
            <div key={a.key} className="flex items-center justify-between px-5 py-3">
              <span className="text-sm text-zinc-200">{a.label}</span>
              <AssetStatusBadge status={a.status} />
            </div>
          ))}
          {[
            { label: "Opening Title Rules", note: brand.openingTitleRules || "Not defined" },
            { label: "Copyright Card", note: brand.copyrightCard },
            { label: "Production Number", note: brand.productionNumber },
          ].map((a) => (
            <div key={a.label} className="flex items-center justify-between px-5 py-3">
              <span className="text-sm text-zinc-200">{a.label}</span>
              <span className="text-xs text-zinc-500 max-w-xs text-right truncate">{a.note}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Episode Structure */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">Episode Structure</h2>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-4 space-y-2">
          {[
            { time: "00:00", label: "Avrrio Entertainment Ident", dim: false },
            { time: "00:10", label: "Cold Open", dim: false },
            { time: "", label: "↓  Castillo title sequence", dim: true },
            { time: "", label: "↓  Episode", dim: true },
            { time: "", label: "↓  End credits", dim: true },
            { time: "", label: "↓  Avrrio Entertainment closing mark", dim: false },
          ].map((row, i) => (
            <div key={i} className="flex items-center gap-4">
              <span className="w-10 flex-shrink-0 text-xs font-mono text-zinc-600">{row.time}</span>
              <span className={`text-sm ${row.dim ? "text-zinc-500" : "text-zinc-300"}`}>{row.label}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-zinc-600">
          The Avrrio ident and Castillo title sequence are separate assets — the ident belongs to the studio; the title sequence belongs to this series.
        </p>
      </section>

      {/* Ident Preview */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Ident Concept Preview</h2>
          {!playing && (
            <button
              onClick={() => { setPlaying(true); setPlayed(false); }}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              {played ? "Replay" : "Preview Ident"}
            </button>
          )}
        </div>
        {playing ? (
          <IdentAnimation onComplete={() => { setPlaying(false); setPlayed(true); }} />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950">
            <p className="text-xs text-zinc-600">{played ? "Preview complete — click Replay to watch again." : "Click Preview Ident to see the concept animation."}</p>
          </div>
        )}
        <p className="mt-2 text-xs text-zinc-600">
          Concept visualization only — not the final asset. The live production will be rendered at 4K/HDR.
        </p>
      </section>

      {/* Storyboard */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">Ident Storyboard</h2>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
          {IDENT_STORYBOARD.map((beat, i) => (
            <div key={i} className="flex items-start gap-4 px-5 py-3">
              <span className="mt-0.5 w-10 flex-shrink-0 font-mono text-sm text-zinc-600 text-center">{beat.icon}</span>
              <div>
                <p className="text-sm font-medium text-zinc-200">{beat.label}</p>
                <p className="text-xs text-zinc-500">{beat.note}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-zinc-600">
          Duration target: 8–12 seconds. Symbolism: imagination becoming reality — scattered ideas → story → image → Avrrio.
        </p>
      </section>

      {/* Ident Variants */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">Ident Variants</h2>
        <div className="space-y-3">
          {brand.identVariants.map((v) => (
            <div key={v.id} className="rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-zinc-100">{v.label}</p>
                    <AssetStatusBadge status={v.status} />
                  </div>
                  <p className="mt-1 text-xs text-zinc-400">{v.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {v.formats.map((f) => (
                      <span key={f} className="rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
                        {ASSET_FORMAT_LABELS[f]}
                      </span>
                    ))}
                    <span className="rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
                      ~{v.durationSeconds}s
                    </span>
                  </div>
                </div>
                <select
                  value={v.status}
                  disabled={saving === v.id}
                  onChange={(e) => handleIdentStatus(v.id, e.target.value as AssetStatus)}
                  className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-300 focus:outline-none disabled:opacity-50"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{ASSET_STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Sonic Signature */}
      {brand.sonicSignature && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">Sonic Signature</h2>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-zinc-100">Original Motif</p>
                  <AssetStatusBadge status={brand.sonicSignature.status} />
                </div>
                <p className="mt-1 text-xs text-zinc-400">{brand.sonicSignature.notes}</p>
                <p className="mt-1 text-xs text-zinc-600">Target: {brand.sonicSignature.durationSeconds}s · Must be recognizable before the logo fully forms</p>
              </div>
              <select
                value={brand.sonicSignature.status}
                disabled={saving === "sonic"}
                onChange={(e) => handleSonicStatus(e.target.value as AssetStatus)}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-300 focus:outline-none disabled:opacity-50"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{ASSET_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
          </div>
          <p className="mt-2 text-xs text-zinc-600">
            Variants share the same underlying motif — tempo and timbre adapt, but the recognizable signature holds across Standard, Dark, Holiday, and Castillo idents.
          </p>
        </section>
      )}

      {/* Production Details */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">Production Details</h2>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
          {([
            { label: "Copyright Card", field: "copyrightCard" as const, value: brand.copyrightCard },
            { label: "Production Number", field: "productionNumber" as const, value: brand.productionNumber },
            { label: "Opening Title Rules", field: "openingTitleRules" as const, value: brand.openingTitleRules },
          ] as const).map((row) => (
            <div key={row.field} className="flex items-center gap-4 px-5 py-3">
              <span className="w-36 flex-shrink-0 text-xs font-medium text-zinc-500">{row.label}</span>
              <input
                defaultValue={row.value}
                onBlur={(e) => {
                  if (e.target.value !== row.value) handleBrandField(row.field, e.target.value);
                }}
                className="flex-1 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-300 focus:border-zinc-500 focus:outline-none"
              />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
