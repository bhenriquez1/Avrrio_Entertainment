"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/firebase/AuthProvider";
import { listCanon, listCharacterVoices, listReferenceAssets, saveReferenceAsset } from "@/lib/production/repository";
import type { CanonRecord } from "@/types/canon";
import type { CharacterVoice, ReferenceAsset } from "@/types/production";

const TABS = [
  { id: "profile", label: "Profile" },
  { id: "relationships", label: "Relationships" },
  { id: "arc", label: "Arc" },
  { id: "powers", label: "Powers" },
  { id: "secrets", label: "Secrets" },
  { id: "visuals", label: "Visuals" },
  { id: "voice", label: "Voice" },
  { id: "appearances", label: "Appearances" },
] as const;

type TabId = typeof TABS[number]["id"];

const VISUAL_SECTIONS = [
  "concept-art",
  "approved-reference",
  "expressions",
  "wardrobe",
  "age-reference",
  "power-visual-language",
] as const;

const VISUAL_STATUSES = ["reference", "proposed", "approved", "canon-visual"] as const;

function avatarColor(name: string) {
  const colors = [
    "from-amber-600 to-amber-800",
    "from-blue-600 to-blue-800",
    "from-emerald-600 to-emerald-800",
    "from-purple-600 to-purple-800",
    "from-rose-600 to-rose-800",
    "from-cyan-600 to-cyan-800",
  ];
  return colors[name.charCodeAt(0) % colors.length];
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function mentionsCharacter(record: CanonRecord, name: string): boolean {
  const lower = name.toLowerCase();
  return (
    record.title.toLowerCase().includes(lower) ||
    record.statement.toLowerCase().includes(lower)
  );
}

function EmptyTab({ charName, productionId, hint }: { charName: string; productionId: string; hint: string }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center">
      <p className="text-sm text-zinc-500">{hint}</p>
      <Link
        href={`/production/${productionId}/creative-room`}
        className="mt-3 inline-block text-xs text-amber-400 hover:text-amber-300"
      >
        Develop {charName} in the Creative Room →
      </Link>
    </div>
  );
}

function RecordCard({ record }: { record: CanonRecord }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-zinc-100">{record.title}</p>
        <span className={`shrink-0 text-[10px] font-semibold uppercase rounded-full border px-2 py-0.5 ${
          record.status === "approved" ? "border-emerald-900/40 text-emerald-400" :
          record.status === "proposed" ? "border-amber-900/40 text-amber-400" :
          "border-zinc-800 text-zinc-600"
        }`}>{record.status}</span>
      </div>
      <p className="mt-1 text-sm text-zinc-400 leading-5">{record.statement}</p>
      {record.reviewNote && <p className="mt-1.5 text-xs text-zinc-600 italic">{record.reviewNote}</p>}
    </div>
  );
}

export default function CharacterDetailPage({ params }: { params: Promise<{ id: string; charId: string }> }) {
  const { id: productionId, charId } = use(params);
  const { uid, status } = useAuth();
  const [character, setCharacter] = useState<CanonRecord | null>(null);
  const [allCanon, setAllCanon] = useState<CanonRecord[]>([]);
  const [assets, setAssets] = useState<ReferenceAsset[]>([]);
  const [voices, setVoices] = useState<CharacterVoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>("profile");

  const load = useCallback(async () => {
    if (status !== "allowed") return;
    const [canon, visualAssets, allVoices] = await Promise.all([
      listCanon(uid, productionId),
      listReferenceAssets(uid, productionId),
      listCharacterVoices(uid, productionId),
    ]);
    const char = canon.find((r) => r.id === charId && r.type === "character") ?? null;
    setCharacter(char);
    setAllCanon(canon);
    setAssets(visualAssets.filter((a) => a.characterId === charId));
    if (char) {
      setVoices(allVoices.filter((v) => v.characterName.toLowerCase() === char.title.toLowerCase()));
    }
    setLoading(false);
  }, [uid, productionId, charId, status]);

  useEffect(() => { void load(); }, [load]);

  async function uploadVisual(section: ReferenceAsset["section"], file: File | null) {
    if (!file || !file.type.startsWith("image/") || file.size > 1_500_000 || !character) return;
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    await saveReferenceAsset(uid, productionId, {
      name: file.name,
      kind: "character",
      dataUrl,
      mimeType: file.type,
      notes: "",
      status: "draft",
      characterId: character.id,
      characterName: character.title,
      section,
      visualStatus: "reference",
      providerReady: false,
    });
    await load();
  }

  async function setVisualStatus(asset: ReferenceAsset, visualStatus: NonNullable<ReferenceAsset["visualStatus"]>) {
    const saved = await saveReferenceAsset(uid, productionId, {
      ...asset,
      visualStatus,
      status: visualStatus === "reference" ? "draft" : visualStatus === "proposed" ? "review" : "approved",
      providerReady: visualStatus === "approved" || visualStatus === "canon-visual",
    });
    setAssets((prev) => prev.map((a) => (a.id === asset.id ? saved : a)));
  }

  if (loading) return <div className="p-8 text-sm text-zinc-500">Loading…</div>;
  if (!character) return (
    <div className="p-8">
      <p className="text-sm text-zinc-400">Character not found.</p>
      <Link href={`/production/${productionId}/characters`} className="mt-2 block text-xs text-zinc-600 hover:text-zinc-400">← Back to Characters</Link>
    </div>
  );

  const charName = character.title;

  // Tab content derivation
  const relationships = allCanon.filter((r) => r.type === "relationship" && mentionsCharacter(r, charName));
  const arc = allCanon.filter((r) => ["canon_decision", "idea"].includes(r.type) && mentionsCharacter(r, charName));
  const powers = allCanon.filter((r) => ["rule", "magic_system"].includes(r.type) && mentionsCharacter(r, charName));
  const secrets = allCanon.filter((r) => r.type === "secret" && mentionsCharacter(r, charName));
  const appearances = allCanon.filter((r) => ["historical_event", "foreshadowing", "season_episode"].includes(r.type) && mentionsCharacter(r, charName));

  const charAssets = assets.filter((a) => a.characterId === charId);
  const portraitAsset = charAssets.find((a) => a.visualStatus === "canon-visual" || a.visualStatus === "approved") ??
    charAssets[0] ?? null;

  return (
    <main className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="border-b border-zinc-800 px-6 pt-6 pb-0">
        <Link href={`/production/${productionId}/characters`} className="text-[10px] text-zinc-600 hover:text-zinc-400">← Characters</Link>
        <div className="flex items-center gap-4 mt-3 mb-4">
          {/* Portrait */}
          {portraitAsset ? (
            <Image
              unoptimized
              src={portraitAsset.dataUrl}
              alt={charName}
              width={64}
              height={64}
              className="h-16 w-16 rounded-xl object-cover ring-1 ring-zinc-700"
            />
          ) : (
            <div className={`flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${avatarColor(charName)} text-lg font-bold text-white`}>
              {initials(charName)}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-zinc-50">{charName}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                character.status === "approved" ? "border-emerald-900/40 text-emerald-400 bg-emerald-950/20" :
                character.status === "proposed" ? "border-amber-900/40 text-amber-400 bg-amber-950/20" :
                "border-zinc-800 text-zinc-600"
              }`}>
                {character.status}
              </span>
              <Link
                href={`/production/${productionId}/creative-room`}
                className="text-[10px] text-amber-400/70 hover:text-amber-300"
              >
                Develop in Creative Room →
              </Link>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-shrink-0 rounded-t-md border-b-2 px-4 py-2 text-xs font-medium transition-colors ${
                tab === t.id
                  ? "border-amber-400 text-amber-200"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {tab === "profile" && (
          <div className="space-y-4 max-w-2xl">
            <RecordCard record={character} />
            {character.reviewNote && (
              <p className="text-xs text-zinc-600 italic px-1">{character.reviewNote}</p>
            )}
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3">
              <p className="text-xs font-semibold text-zinc-500 mb-1">Source</p>
              <p className="text-xs text-zinc-400">{character.source || "—"}</p>
            </div>
          </div>
        )}

        {tab === "relationships" && (
          <div className="space-y-3 max-w-2xl">
            {relationships.length === 0 ? (
              <EmptyTab charName={charName} productionId={productionId} hint="No relationship canon for this character yet." />
            ) : relationships.map((r) => <RecordCard key={r.id} record={r} />)}
          </div>
        )}

        {tab === "arc" && (
          <div className="space-y-3 max-w-2xl">
            {arc.length === 0 ? (
              <EmptyTab charName={charName} productionId={productionId} hint="No arc decisions recorded yet." />
            ) : arc.map((r) => <RecordCard key={r.id} record={r} />)}
          </div>
        )}

        {tab === "powers" && (
          <div className="space-y-3 max-w-2xl">
            {powers.length === 0 ? (
              <EmptyTab charName={charName} productionId={productionId} hint="No powers or rules recorded for this character yet." />
            ) : powers.map((r) => <RecordCard key={r.id} record={r} />)}
          </div>
        )}

        {tab === "secrets" && (
          <div className="space-y-3 max-w-2xl">
            {secrets.length === 0 ? (
              <EmptyTab charName={charName} productionId={productionId} hint="No secrets recorded for this character yet." />
            ) : secrets.map((r) => <RecordCard key={r.id} record={r} />)}
          </div>
        )}

        {tab === "visuals" && (
          <div className="grid gap-4 sm:grid-cols-2 max-w-3xl">
            {VISUAL_SECTIONS.map((section) => {
              const sectionAssets = charAssets.filter((a) => a.section === section);
              return (
                <div key={section} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      {section.replaceAll("-", " ")}
                    </h3>
                    <label className="cursor-pointer text-[10px] font-semibold text-amber-400 hover:text-amber-300">
                      + Upload
                      <input
                        className="hidden"
                        type="file"
                        accept="image/*"
                        onChange={(e) => void uploadVisual(section, e.target.files?.[0] ?? null)}
                      />
                    </label>
                  </div>
                  {sectionAssets.length === 0 ? (
                    <p className="text-[10px] text-zinc-700">No reference yet</p>
                  ) : (
                    <div className="space-y-3">
                      {sectionAssets.map((asset) => (
                        <div key={asset.id} className="flex gap-3 items-start">
                          <Image
                            unoptimized
                            src={asset.dataUrl}
                            alt={asset.name}
                            width={64}
                            height={64}
                            className="h-16 w-16 rounded-lg object-cover flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-xs text-zinc-300">{asset.name}</p>
                            <select
                              value={asset.visualStatus ?? "reference"}
                              onChange={(e) => void setVisualStatus(asset, e.target.value as NonNullable<ReferenceAsset["visualStatus"]>)}
                              className="mt-1 rounded bg-zinc-950 px-2 py-1 text-[10px] font-bold uppercase text-amber-300"
                            >
                              {VISUAL_STATUSES.map((s) => (
                                <option key={s} value={s}>{s.replaceAll("-", " ")}</option>
                              ))}
                            </select>
                            {asset.providerReady && (
                              <p className="mt-1 text-[10px] text-emerald-400">Ready for Runway / Kling / Blender</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === "voice" && (
          <div className="max-w-2xl space-y-4">
            {voices.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center">
                <p className="text-sm text-zinc-500">No voices registered for {charName} yet.</p>
                <Link
                  href={`/production/${productionId}/voices`}
                  className="mt-3 inline-block text-xs text-amber-400 hover:text-amber-300"
                >
                  Register a voice in the Voice Registry →
                </Link>
              </div>
            ) : (
              <>
                {voices.map((voice) => (
                  <div key={voice.id} className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-mono text-zinc-500">{voice.voiceId} · v{voice.voiceVersion}</p>
                        <p className="mt-0.5 text-sm text-zinc-300">{voice.emotionalDirection || "No emotional direction set"}</p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        voice.status === "approved" ? "border-emerald-900/40 text-emerald-400" :
                        voice.status === "retired" ? "border-zinc-800 text-zinc-600" :
                        "border-amber-900/40 text-amber-400"
                      }`}>
                        {voice.status}
                      </span>
                    </div>
                    {voice.notes && <p className="mt-1.5 text-xs text-zinc-600 italic">{voice.notes}</p>}
                  </div>
                ))}
                <Link
                  href={`/production/${productionId}/voices`}
                  className="block text-xs text-zinc-600 hover:text-zinc-400"
                >
                  Manage in Voice Registry →
                </Link>
              </>
            )}
          </div>
        )}

        {tab === "appearances" && (
          <div className="space-y-3 max-w-2xl">
            {appearances.length === 0 ? (
              <EmptyTab charName={charName} productionId={productionId} hint="No timeline events or foreshadowing recorded for this character yet." />
            ) : appearances.map((r) => <RecordCard key={r.id} record={r} />)}
          </div>
        )}
      </div>
    </main>
  );
}
