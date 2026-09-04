"use client";
import { use, useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/firebase/AuthProvider";
import { listCharacterVoices, saveCharacterVoice } from "@/lib/production/repository";
import type { CharacterVoice } from "@/types/production";

const STARTERS = ["Samantha", "Arianna", "Joshua", "Ismael", "Brian"];

export default function VoicesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { uid, status, getIdToken } = useAuth();
  const [voices, setVoices] = useState<CharacterVoice[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [characterName, setCharacterName] = useState(STARTERS[0]);
  const [voiceId, setVoiceId] = useState("");
  const [direction, setDirection] = useState("");
  const [notes, setNotes] = useState("");
  const [previewText, setPreviewText] = useState("Something changed when I woke up. I just don't know what it was.");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const load = useCallback(async () => { if (status === "allowed") setVoices(await listCharacterVoices(uid, id)); }, [id, status, uid]);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!characterName.trim() || !voiceId.trim()) return;
    const item = await saveCharacterVoice(uid, id, { characterName: characterName.trim(), provider: "elevenlabs", voiceId: voiceId.trim(), voiceVersion: "1.0", status: "candidate", emotionalDirection: direction.trim(), notes: notes.trim() });
    setVoices((current) => [...current, item]); setVoiceId(""); setDirection(""); setNotes(""); setShowForm(false);
  }

  async function setVoiceStatus(voice: CharacterVoice, next: CharacterVoice["status"]) {
    const updated = await saveCharacterVoice(uid, id, { ...voice, status: next });
    setVoices((current) => current.map((item) => item.id === voice.id ? updated : item));
  }

  async function previewVoice(voice: CharacterVoice) {
    if (!previewText.trim() || !window.confirm(`Generate an ElevenLabs preview for ${voice.characterName}? This uses ElevenLabs credits.`)) return;
    setPreviewing(voice.id); setPreviewError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const token = await getIdToken();
    const response = await fetch("/api/production/voice-preview", { method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ voiceId: voice.voiceId, text: previewText.trim(), confirmedCharge: true }) });
    if (!response.ok) { const data = await response.json() as { error?: string }; setPreviewError(data.error ?? "Preview failed."); setPreviewing(null); return; }
    setPreviewUrl(URL.createObjectURL(await response.blob())); setPreviewing(null);
  }

  return <main className="min-h-full bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,.10),transparent_35%)] p-8"><div className="mx-auto max-w-5xl">
    <div className="flex items-end justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.28em] text-amber-300/75">Voice Department</p><h1 className="mt-2 text-2xl font-semibold text-white">Character Voice Registry</h1><p className="mt-2 text-sm text-slate-400">Versioned ElevenLabs voices with explicit human approval.</p></div><button onClick={() => setShowForm(true)} className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-950">+ Register Candidate</button></div>
    <div className="mt-5 rounded-xl border border-amber-300/15 bg-amber-300/[0.04] px-4 py-3 text-xs text-amber-100/60">No character voice becomes final automatically. Every preview uses credits and requires confirmation.</div>
    <div className="mt-4 rounded-xl border border-blue-200/10 bg-white/[0.025] p-4"><label className="text-xs text-slate-400">Shared preview line<textarea value={previewText} onChange={(event) => setPreviewText(event.target.value.slice(0, 500))} rows={2} className="mt-2 w-full resize-none rounded-lg border border-blue-200/10 bg-black/20 px-3 py-2 text-sm text-white outline-none" /></label><div className="mt-2 flex items-center gap-3">{previewUrl && <audio controls src={previewUrl} className="h-9 max-w-full" />}{previewError && <p className="text-xs text-red-300">{previewError}</p>}<span className="ml-auto text-[10px] text-slate-600">{previewText.length}/500</span></div></div>
    {showForm && <form onSubmit={save} className="mt-6 rounded-2xl border border-blue-200/10 bg-[#0b1122] p-6"><div className="grid gap-4 md:grid-cols-2"><label className="text-xs text-slate-400">Character<input list="avrrio-characters" value={characterName} onChange={(event) => setCharacterName(event.target.value)} className="mt-1.5 w-full rounded-lg border border-blue-200/10 bg-black/20 px-3 py-2.5 text-sm text-white" /><datalist id="avrrio-characters">{STARTERS.map((name) => <option key={name} value={name} />)}</datalist></label><label className="text-xs text-slate-400">ElevenLabs Voice ID<input value={voiceId} onChange={(event) => setVoiceId(event.target.value)} className="mt-1.5 w-full rounded-lg border border-blue-200/10 bg-black/20 px-3 py-2.5 font-mono text-sm text-white" placeholder="Voice ID only — never an API key" /></label></div><label className="mt-4 block text-xs text-slate-400">Emotional direction<input value={direction} onChange={(event) => setDirection(event.target.value)} className="mt-1.5 w-full rounded-lg border border-blue-200/10 bg-black/20 px-3 py-2.5 text-sm text-white" placeholder="Warm, guarded, increasingly urgent…" /></label><label className="mt-4 block text-xs text-slate-400">Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} className="mt-1.5 w-full resize-none rounded-lg border border-blue-200/10 bg-black/20 px-3 py-2.5 text-sm text-white" /></label><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setShowForm(false)} className="px-3 py-2 text-xs text-slate-500">Cancel</button><button className="rounded-lg bg-amber-300 px-4 py-2 text-xs font-bold text-slate-950">Save Candidate</button></div></form>}
    <div className="mt-8 grid gap-3 md:grid-cols-2">{voices.map((voice) => <article key={voice.id} className="rounded-xl border border-blue-200/10 bg-white/[0.025] p-5"><div className="flex items-start justify-between"><div><h2 className="font-semibold text-white">{voice.characterName}</h2><p className="mt-1 font-mono text-[10px] text-slate-600">{voice.voiceId} • v{voice.voiceVersion}</p></div><span className={`rounded-full border px-2 py-1 text-[9px] font-bold uppercase ${voice.status === "approved" ? "border-emerald-300/20 text-emerald-300" : voice.status === "retired" ? "border-slate-500/20 text-slate-500" : "border-amber-300/20 text-amber-200"}`}>{voice.status}</span></div>{voice.emotionalDirection && <p className="mt-4 text-sm text-slate-400">{voice.emotionalDirection}</p>}<div className="mt-4 flex flex-wrap gap-4 text-xs"><button onClick={() => void previewVoice(voice)} disabled={previewing === voice.id} className="text-cyan-300 disabled:opacity-40">{previewing === voice.id ? "Generating…" : "Generate preview"}</button>{voice.status === "candidate" && <button onClick={() => void setVoiceStatus(voice, "approved")} className="text-emerald-300">Approve voice</button>}{voice.status !== "retired" && <button onClick={() => void setVoiceStatus(voice, "retired")} className="text-slate-600">Retire</button>}</div></article>)}{voices.length === 0 && <div className="col-span-full rounded-2xl border border-dashed border-blue-200/10 py-16 text-center text-sm text-slate-500">No character voices registered yet.</div>}</div>
  </div></main>;
}
