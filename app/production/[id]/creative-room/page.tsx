"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/firebase/AuthProvider";
import { listCanon, listCreativeMessages, saveCanonRecord, saveCreativeMessage } from "@/lib/production/repository";
import type { CanonRecord, CanonType } from "@/types/canon";
import type { CreativeMessage, CreativeRoomMode, CreativeRoomResponse } from "@/types/ai";

const MODES: Array<{ id: CreativeRoomMode; label: string; help: string }> = [
  { id: "openai", label: "ChatGPT", help: "Develop story ideas" },
  { id: "claude", label: "Claude", help: "Critique and continuity" },
  { id: "both", label: "Both", help: "Independent responses" },
  { id: "council", label: "Creative Council", help: "Proposal, critique, synthesis" },
];

const ROLE_LABEL: Record<CreativeMessage["role"], string> = {
  user: "Brian",
  openai: "ChatGPT",
  claude: "Claude",
  synthesis: "Council Synthesis",
  system: "Avrrio",
};

function newId() {
  try { return crypto.randomUUID(); } catch { return `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
}

export default function CreativeRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: productionId } = use(params);
  const { uid, status, getIdToken } = useAuth();
  const [mode, setMode] = useState<CreativeRoomMode>("openai");
  const [contextLabel, setContextLabel] = useState("General story development");
  const [messages, setMessages] = useState<CreativeMessage[]>([]);
  const [canon, setCanon] = useState<CanonRecord[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (status !== "allowed") return;
    const [history, canonRecords] = await Promise.all([
      listCreativeMessages(uid, productionId),
      listCanon(uid, productionId),
    ]);
    setMessages(history.sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
    setCanon(canonRecords);
  }, [productionId, status, uid]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const approvedCanon = useMemo(() => canon.filter((item) => item.status === "approved"), [canon]);

  async function persist(message: CreativeMessage) {
    await saveCreativeMessage(uid, productionId, message);
  }

  async function sendMessage() {
    const question = draft.trim();
    if (!question || sending) return;
    setSending(true);
    setError(null);
    setDraft("");
    const userMessage: CreativeMessage = {
      id: newId(), productionId, role: "user", content: question, mode, contextLabel, createdAt: new Date().toISOString(),
    };
    setMessages((current) => [...current, userMessage]);
    await persist(userMessage);

    try {
      const token = await getIdToken();
      const response = await fetch("/api/creative-room", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          question,
          mode,
          contextLabel,
          approvedCanon: approvedCanon.map(({ type, title, statement }) => ({ type, title, statement })),
          recentHistory: messages.slice(-12).map(({ role, content }) => ({ role, content })),
        }),
      });
      const data = await response.json() as CreativeRoomResponse & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Creative Room could not respond.");
      const created = data.responses.map((item, index): CreativeMessage => ({
        id: newId(), productionId, role: item.role, content: item.content, mode, contextLabel,
        createdAt: new Date(Date.now() + index).toISOString(),
      }));
      setMessages((current) => [...current, ...created]);
      await Promise.all(created.map(persist));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Creative Room could not respond.");
    } finally {
      setSending(false);
    }
  }

  async function remember(message: CreativeMessage, decision: "idea" | "canon" | "rejected") {
    const record = await saveCanonRecord(uid, productionId, {
      productionId,
      type: "world_detail" as CanonType,
      title: `${decision === "canon" ? "Canon decision" : decision === "idea" ? "Creative idea" : "Rejected direction"}: ${contextLabel}`,
      statement: message.content,
      status: decision === "canon" ? "approved" : decision === "rejected" ? "rejected" : "proposed",
      source: "Creative Room",
      proposedBy: message.role === "claude" ? "claude" : "openai",
      approvedBy: decision === "canon" ? uid : null,
      canonVersion: "1.0",
      supersedes: null,
      dependencies: [],
      reviewNote: decision === "idea" ? "Saved as an idea; not canon." : "",
      contradictions: [],
    });
    setCanon((current) => [...current, record]);
  }

  return (
    <main className="flex h-full min-h-0 flex-col bg-zinc-950">
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-400">Avrrio Story Intelligence</p>
            <h1 className="text-xl font-bold text-zinc-50">Creative Room</h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400" /> ChatGPT
            <span className="ml-2 h-2 w-2 rounded-full bg-emerald-400" /> Claude
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {MODES.map((item) => (
            <button key={item.id} onClick={() => setMode(item.id)} title={item.help}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${mode === item.id ? "border-amber-400/60 bg-amber-400/10 text-amber-200" : "border-zinc-800 text-zinc-500 hover:text-zinc-300"}`}>
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <section className="border-b border-zinc-800 bg-zinc-900/40 px-6 py-3">
        <label className="flex items-center gap-3 text-xs text-zinc-500">
          Context
          <input value={contextLabel} onChange={(event) => setContextLabel(event.target.value)}
            className="min-w-0 flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-200 outline-none focus:border-zinc-600"
            placeholder="Samantha • Season 1 • Dream scene" />
          <span>{approvedCanon.length} canon facts</span>
        </label>
      </section>

      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
        {messages.length === 0 && (
          <div className="mx-auto max-w-xl rounded-xl border border-dashed border-zinc-800 p-8 text-center">
            <p className="text-sm font-medium text-zinc-300">The room is ready.</p>
            <p className="mt-2 text-xs leading-5 text-zinc-500">Set the scene or character in Context, then continue developing the story. Ideas remain proposals until you explicitly make them canon.</p>
          </div>
        )}
        {messages.map((message) => (
          <article key={message.id} className={`max-w-3xl ${message.role === "user" ? "ml-auto" : "mr-auto"}`}>
            <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              {ROLE_LABEL[message.role]} <span className="font-normal normal-case tracking-normal text-zinc-700">{message.contextLabel}</span>
            </div>
            <div className={`whitespace-pre-wrap rounded-xl border px-4 py-3 text-sm leading-6 ${message.role === "user" ? "border-amber-500/20 bg-amber-500/10 text-zinc-100" : "border-zinc-800 bg-zinc-900 text-zinc-300"}`}>
              {message.content}
            </div>
            {message.role !== "user" && message.role !== "system" && (
              <div className="mt-2 flex gap-3 text-[11px] text-zinc-500">
                <button onClick={() => remember(message, "idea")} className="hover:text-zinc-200">♡ Save Idea</button>
                <button onClick={() => remember(message, "canon")} className="hover:text-emerald-300">✓ Make Canon</button>
                <button onClick={() => remember(message, "rejected")} className="hover:text-red-300">✕ Reject</button>
              </div>
            )}
          </article>
        ))}
        {sending && <p className="text-xs text-amber-300 animate-pulse">The room is thinking…</p>}
        {error && <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">{error}</p>}
      </div>

      <footer className="border-t border-zinc-800 bg-zinc-950 p-4">
        <div className="mx-auto flex max-w-4xl items-end gap-3 rounded-xl border border-zinc-700 bg-zinc-900 p-3 focus-within:border-amber-500/50">
          <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={2}
            onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }}
            placeholder="Talk about the story… Try /continuity, /brainstorm, or /critic"
            className="min-h-12 flex-1 resize-none bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600" />
          <button disabled={!draft.trim() || sending} onClick={() => void sendMessage()}
            className="rounded-lg bg-amber-300 px-4 py-2 text-sm font-bold text-zinc-950 disabled:opacity-30">Send</button>
        </div>
      </footer>
    </main>
  );
}
