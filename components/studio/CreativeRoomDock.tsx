"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/firebase/AuthProvider";
import { listCanon, saveCreativeMessage } from "@/lib/production/repository";
import type { CanonRecord } from "@/types/canon";
import type { CreativeMessage, CreativeRoomMode, CreativeRoomResponse } from "@/types/ai";

const MODES: Array<[CreativeRoomMode, string]> = [["openai", "ChatGPT"], ["claude", "Claude"], ["both", "Both"], ["council", "Council"]];

function contextFromPath(pathname: string) {
  const leaf = pathname.split("/").filter(Boolean).at(-1) ?? "production";
  return leaf.split("-").map((word) => word[0]?.toUpperCase() + word.slice(1)).join(" ");
}

function newId() {
  try { return crypto.randomUUID(); } catch { return `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
}

const ROLE_LABEL: Record<string, string> = { openai: "ChatGPT", claude: "Claude", synthesis: "Council" };

export function CreativeRoomDock({ productionId }: { productionId: string }) {
  const pathname = usePathname();
  const { uid, status, getIdToken } = useAuth();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<CreativeRoomMode>("openai");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [canon, setCanon] = useState<CanonRecord[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const context = useMemo(() => contextFromPath(pathname), [pathname]);

  const loadCanon = useCallback(async () => {
    if (status !== "allowed" || !uid) return;
    const records = await listCanon(uid, productionId);
    setCanon(records);
  }, [uid, productionId, status]);

  useEffect(() => {
    if (open) void loadCanon();
  }, [open, loadCanon]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const approvedCanon = useMemo(
    () => canon.filter((r) => r.status === "approved").map(({ type, title, statement }) => ({ type, title, statement })),
    [canon]
  );

  async function send() {
    if (!draft.trim() || sending) return;
    const question = draft.trim();
    setSending(true);
    setError(null);
    setDraft("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);

    try {
      const token = await getIdToken();
      const recentHistory = messages.slice(-10).map(({ role, content }) => ({ role, content }));
      const response = await fetch("/api/creative-room", {
        method: "POST",
        headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ question, mode, contextLabel: context, approvedCanon, recentHistory }),
      });
      const data = await response.json() as CreativeRoomResponse & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Creative Room could not respond.");

      const incoming = data.responses.map((item) => ({ role: item.role, content: item.content }));
      setMessages((prev) => [...prev, ...incoming]);

      // Persist to history
      const userMsg: CreativeMessage = { id: newId(), productionId, role: "user", content: question, mode, contextLabel: context, createdAt: new Date().toISOString() };
      await saveCreativeMessage(uid, productionId, userMsg);
      for (const [i, item] of data.responses.entries()) {
        const aiMsg: CreativeMessage = { id: newId(), productionId, role: item.role, content: item.content, mode, contextLabel: context, createdAt: new Date(Date.now() + i + 1).toISOString() };
        await saveCreativeMessage(uid, productionId, aiMsg);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Creative Room could not respond.");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setSending(false);
    }
  }

  if (pathname.endsWith("/creative-room")) return null;

  return (
    <div className="fixed bottom-5 right-5 z-40">
      {open && (
        <section className="mb-3 flex h-[34rem] w-[min(26rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-amber-200/20 bg-[#080d1c]/95 shadow-2xl shadow-black/60 backdrop-blur-xl">
          <header className="border-b border-blue-200/10 bg-gradient-to-r from-blue-950/80 to-slate-950 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-amber-300">Avrrio Creative Room</p>
                <p className="mt-0.5 text-xs text-blue-100/55">Context: {context} · {approvedCanon.length} canon facts</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-lg leading-none text-slate-500 hover:text-white" aria-label="Close">×</button>
            </div>
            <div className="mt-3 flex gap-1.5">
              {MODES.map(([id, label]) => (
                <button key={id} onClick={() => setMode(id)} className={`rounded-full px-2.5 py-1 text-[10px] ${mode === id ? "bg-amber-300 text-slate-950" : "bg-white/5 text-slate-400"}`}>{label}</button>
              ))}
            </div>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && !sending && (
              <div className="mt-10 text-center">
                <div className="mx-auto mb-3 h-8 w-8 rounded-full border border-amber-300/30 bg-amber-300/5 text-center leading-8 text-amber-300">✦</div>
                <p className="text-xs text-slate-400">Continue developing this part of the story.</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`text-xs leading-5 ${msg.role === "user" ? "text-right" : "text-left"}`}>
                {msg.role !== "user" && <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{ROLE_LABEL[msg.role] ?? msg.role}</p>}
                <div className={`inline-block max-w-[90%] whitespace-pre-wrap rounded-xl px-3 py-2 text-left ${msg.role === "user" ? "bg-amber-300/10 text-zinc-100 border border-amber-200/15" : "border border-blue-200/10 bg-white/[0.04] text-slate-300"}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {sending && <p className="text-center text-[11px] text-amber-300 animate-pulse">The room is thinking…</p>}
            {error && <p className="rounded-lg border border-red-900/40 bg-red-950/20 px-3 py-2 text-xs text-red-300">{error}</p>}
            <div ref={bottomRef} />
          </div>

          <footer className="border-t border-blue-200/10 p-3">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
              rows={2}
              placeholder="Talk about the story…"
              className="w-full resize-none rounded-xl border border-blue-200/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-amber-300/30"
            />
            <div className="mt-2 flex items-center justify-between">
              <Link href={`/production/${productionId}/creative-room`} className="text-[11px] text-blue-200/45 hover:text-blue-100">Open full history →</Link>
              <button onClick={() => void send()} disabled={!draft.trim() || sending} className="rounded-lg bg-amber-300 px-3 py-1.5 text-xs font-bold text-slate-950 disabled:opacity-30">
                {sending ? "Thinking…" : "Send"}
              </button>
            </div>
          </footer>
        </section>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-amber-200/25 bg-gradient-to-r from-blue-950 to-slate-950 px-4 py-3 text-sm font-semibold text-slate-100 shadow-xl shadow-black/50 hover:border-amber-200/45"
      >
        <span className="text-amber-300">✦</span> Creative Room
      </button>
    </div>
  );
}
