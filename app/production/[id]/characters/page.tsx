"use client";

import { use, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useAuth } from "@/lib/firebase/AuthProvider";
import { listCanon, listReferenceAssets, saveCanonRecord, saveReferenceAsset } from "@/lib/production/repository";
import type { CanonRecord } from "@/types/canon";
import type { ReferenceAsset } from "@/types/production";

const VISUAL_SECTIONS = ["concept-art","approved-reference","expressions","wardrobe","age-reference","power-visual-language","voice","production-assets"] as const;
const VISUAL_STATUSES = ["reference","proposed","approved","canon-visual"] as const;

const CASTILLO_STUBS: Array<{ name: string; statement: string }> = [
  {
    name: "Samantha",
    statement: "Samantha is a principal character in Castillo. Age: 16. Additional details to be developed and approved.",
  },
  {
    name: "Arianna",
    statement: "Arianna is a principal character in Castillo. Age: 16. Additional details to be developed and approved.",
  },
  {
    name: "Joshua",
    statement: "Joshua is a principal character in Castillo. Additional details to be developed and approved.",
  },
  {
    name: "Ismael",
    statement: "Ismael is a principal character in Castillo. Additional details to be developed and approved.",
  },
  {
    name: "Brian",
    statement: "Brian is a principal character in Castillo. Additional details to be developed and approved.",
  },
  {
    name: "Mackenzie",
    statement: "Mackenzie is a principal character in Castillo. Additional details to be developed and approved.",
  },
];

function statusColor(status: CanonRecord["status"]) {
  switch (status) {
    case "approved": return "text-emerald-400 border-emerald-900/40 bg-emerald-950/20";
    case "proposed": return "text-amber-400 border-amber-900/40 bg-amber-950/20";
    case "rejected": return "text-red-400 border-red-900/40 bg-red-950/20";
    default: return "text-zinc-400 border-zinc-800 bg-zinc-900/40";
  }
}

export default function CharactersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: productionId } = use(params);
  const { uid, status } = useAuth();
  const [characters, setCharacters] = useState<CanonRecord[]>([]);
  const [assets, setAssets] = useState<ReferenceAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const load = useCallback(async () => {
    if (status !== "allowed") return;
    const [all, visualAssets] = await Promise.all([listCanon(uid, productionId), listReferenceAssets(uid, productionId)]);
    setCharacters(all.filter((r) => r.type === "character").sort((a, b) => a.title.localeCompare(b.title)));
    setAssets(visualAssets.filter((a) => a.kind === "character"));
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
        reviewNote: "Stub character entity. Flesh out details in the Creative Room and approve canon facts as they are confirmed.",
        contradictions: [],
      });
    }
    await load();
    setSeeding(false);
  }

  async function uploadVisual(char: CanonRecord, section: ReferenceAsset["section"], file: File | null) {
    if (!file || !file.type.startsWith("image/") || file.size > 1_500_000) return;
    const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload=()=>resolve(String(reader.result)); reader.onerror=()=>reject(reader.error); reader.readAsDataURL(file); });
    await saveReferenceAsset(uid, productionId, { name:file.name, kind:"character", dataUrl, mimeType:file.type, notes:"", status:"draft", characterId:char.id, characterName:char.title, section, visualStatus:"reference", providerReady:false });
    await load();
  }
  async function setVisualStatus(asset: ReferenceAsset, visualStatus: NonNullable<ReferenceAsset["visualStatus"]>) {
    const saved=await saveReferenceAsset(uid,productionId,{...asset,visualStatus,status:visualStatus==="reference"?"draft":visualStatus==="proposed"?"review":"approved",providerReady:visualStatus==="approved"||visualStatus==="canon-visual"});
    setAssets(current=>current.map(item=>item.id===asset.id?saved:item));
  }

  const approved = characters.filter((c) => c.status === "approved");
  const proposed = characters.filter((c) => c.status === "proposed");
  const needsSeed = CASTILLO_STUBS.some((s) => !characters.find((c) => c.title.toLowerCase() === s.name.toLowerCase()));

  if (loading) return <div className="p-8 text-sm text-zinc-500">Loading…</div>;

  return (
    <main className="p-8 max-w-3xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-50">Characters</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            {approved.length} approved · {proposed.length} proposed
          </p>
        </div>
        {needsSeed && (
          <button
            onClick={() => void seedCastilloCharacters()}
            disabled={seeding}
            className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 disabled:opacity-40 transition-colors"
          >
            {seeding ? "Seeding…" : "Seed Castillo Characters"}
          </button>
        )}
      </div>

      {characters.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-800 p-8 text-center">
          <p className="text-sm text-zinc-400">No character entities yet.</p>
          <p className="mt-2 text-xs text-zinc-600">
            Seed the Castillo principal cast to create placeholder entities, then develop and approve details in the Creative Room.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {characters.map((char) => (
            <div key={char.id} className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-zinc-100">{char.title}</h2>
                  <p className="mt-1 text-sm text-zinc-400 leading-5">{char.statement}</p>
                  {char.reviewNote && (
                    <p className="mt-2 text-xs text-zinc-600 italic">{char.reviewNote}</p>
                  )}
                </div>
                <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${statusColor(char.status)}`}>
                  {char.status}
                </span>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {VISUAL_SECTIONS.map(section=>{const sectionAssets=assets.filter(a=>a.characterId===char.id&&a.section===section);return <section key={section} className="rounded-xl border border-white/5 bg-black/20 p-3"><div className="flex items-center justify-between"><h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{section.replaceAll("-"," ")}</h3><label className="cursor-pointer text-[10px] text-cyan-300">+ Upload<input className="hidden" type="file" accept="image/*" onChange={e=>void uploadVisual(char,section,e.target.files?.[0]??null)}/></label></div><div className="mt-2 space-y-2">{sectionAssets.map(asset=><div key={asset.id} className="flex gap-3"><Image unoptimized src={asset.dataUrl} alt={asset.name} width={72} height={72} className="h-16 w-16 rounded-lg object-cover"/><div className="min-w-0"><p className="truncate text-xs text-zinc-300">{asset.name}</p><select value={asset.visualStatus||"reference"} onChange={e=>void setVisualStatus(asset,e.target.value as NonNullable<ReferenceAsset["visualStatus"]>)} className="mt-1 max-w-full rounded bg-zinc-950 px-2 py-1 text-[9px] font-bold uppercase text-amber-300">{VISUAL_STATUSES.map(s=><option key={s} value={s}>{s.replace("-"," ")}</option>)}</select>{asset.providerReady&&<p className="mt-1 text-[9px] text-emerald-400">Ready for Runway / Kling / Blender</p>}</div></div>)}{!sectionAssets.length&&<p className="text-[10px] text-zinc-700">No reference yet</p>}</div></section>})}
              </div>
            </div>
          ))}
        </div>
      )}

      {proposed.length > 0 && (
        <p className="mt-4 text-xs text-zinc-600">
          Proposed characters await approval in{" "}
          <a href={`/production/${productionId}/canon`} className="text-zinc-400 underline hover:text-zinc-200">Canon → Pending</a>.
        </p>
      )}
    </main>
  );
}
