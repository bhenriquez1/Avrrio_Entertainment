"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/firebase/AuthProvider";
import {
  listCanon,
  saveCanonRecord,
  listConversationThreads,
  saveConversationThread,
  deleteConversationThread,
  listThreadMessages,
  saveThreadMessage,
} from "@/lib/production/repository";
import type { CanonRecord, CanonType } from "@/types/canon";
import type { ConversationThread, CreativeMessage, CreativeRoomMode, CreativeRoomResponse, DetectDecisionsResult, StoryDecisionProposal } from "@/types/ai";

const MODES: Array<{ id: CreativeRoomMode; label: string }> = [
  { id: "openai", label: "ChatGPT" },
  { id: "claude", label: "Claude" },
  { id: "both", label: "Both" },
  { id: "council", label: "Council" },
];

const ROLE_LABEL: Record<CreativeMessage["role"], string> = {
  user: "Brian",
  openai: "ChatGPT",
  claude: "Claude",
  synthesis: "Council",
  system: "Avrrio",
};

const WORKING_ON_OPTIONS = [
  "General",
  "Samantha",
  "Arianna",
  "Joshua",
  "Ismael",
  "Brian",
  "Mackenzie",
  "Pilot — Episode 1",
  "Season 1 arc",
  "Dream sequence",
  "Powers & rules",
  "World building",
];

function newId() {
  try { return crypto.randomUUID(); } catch { return `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
}

function autoTitle(firstMessage: string): string {
  const words = firstMessage.trim().split(/\s+/).slice(0, 6).join(" ");
  return words.length > 0 ? words : "New conversation";
}

export default function CreativeRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: productionId } = use(params);
  const { uid, status, getIdToken } = useAuth();

  // Threads
  const [threads, setThreads] = useState<ConversationThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [threadSearch, setThreadSearch] = useState("");

  // Messages
  const [messages, setMessages] = useState<CreativeMessage[]>([]);

  // Canon
  const [canon, setCanon] = useState<CanonRecord[]>([]);

  // Compose
  const [mode, setMode] = useState<CreativeRoomMode>("openai");
  const [workingOn, setWorkingOn] = useState("General");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detection
  const [proposals, setProposals] = useState<StoryDecisionProposal[]>([]);
  const [showReview, setShowReview] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [editingProposal, setEditingProposal] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const recognizerRef = useRef<{ stop: () => void } | null>(null);
  const [isListening, setIsListening] = useState(false);

  const approvedCanon = useMemo(() => canon.filter((c) => c.status === "approved"), [canon]);

  const loadData = useCallback(async () => {
    if (status !== "allowed") return;
    const [threadList, canonRecords] = await Promise.all([
      listConversationThreads(uid, productionId),
      listCanon(uid, productionId),
    ]);
    const sorted = threadList
      .filter((t) => !t.archived)
      .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
    setThreads(sorted);
    setCanon(canonRecords);
    if (sorted.length > 0 && !activeThreadId) {
      setActiveThreadId(sorted[0].id);
    }
  }, [uid, productionId, status, activeThreadId]);

  useEffect(() => { void loadData(); }, [loadData]);

  // Load messages whenever thread changes
  useEffect(() => {
    if (!activeThreadId || status !== "allowed") return;
    void listThreadMessages(uid, productionId, activeThreadId).then((msgs) => {
      setMessages(msgs.sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
      setProposals([]);
      setShowReview(false);
    });
  }, [activeThreadId, uid, productionId, status]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const activeThread = threads.find((t) => t.id === activeThreadId) ?? null;

  async function newThread() {
    const thread = await saveConversationThread(uid, productionId, {
      title: "New conversation",
      workingOn: "General",
      lastMessageAt: new Date().toISOString(),
      archived: false,
    });
    setThreads((prev) => [thread, ...prev]);
    setActiveThreadId(thread.id);
    setMessages([]);
    setProposals([]);
    setShowReview(false);
    setWorkingOn("General");
  }

  async function branchThread() {
    if (!activeThreadId) return;
    const sourceThread = threads.find((t) => t.id === activeThreadId);
    if (!sourceThread) return;
    const branchThread = await saveConversationThread(uid, productionId, {
      title: `Branch: ${sourceThread.title}`,
      workingOn: sourceThread.workingOn,
      lastMessageAt: new Date().toISOString(),
      archived: false,
    });
    // Copy messages up to current point into the new thread
    for (const msg of messages) {
      await saveThreadMessage(uid, productionId, branchThread.id, { ...msg });
    }
    setThreads((prev) => [branchThread, ...prev]);
    setActiveThreadId(branchThread.id);
    setProposals([]);
    setShowReview(false);
  }

  async function archiveThread(threadId: string) {
    const thread = threads.find((t) => t.id === threadId);
    if (!thread) return;
    await saveConversationThread(uid, productionId, { ...thread, archived: true });
    setThreads((prev) => prev.filter((t) => t.id !== threadId));
    if (activeThreadId === threadId) {
      const remaining = threads.filter((t) => t.id !== threadId);
      setActiveThreadId(remaining[0]?.id ?? null);
    }
  }

  async function renameThread(threadId: string, newTitle: string) {
    const thread = threads.find((t) => t.id === threadId);
    if (!thread) return;
    const updated = await saveConversationThread(uid, productionId, { ...thread, title: newTitle });
    setThreads((prev) => prev.map((t) => (t.id === threadId ? updated : t)));
    setRenamingId(null);
  }

  async function updateThreadWorkingOn(threadId: string, newWorkingOn: string) {
    const thread = threads.find((t) => t.id === threadId);
    if (!thread) return;
    const updated = await saveConversationThread(uid, productionId, { ...thread, workingOn: newWorkingOn });
    setThreads((prev) => prev.map((t) => (t.id === threadId ? updated : t)));
    setWorkingOn(newWorkingOn);
  }

  async function sendMessage() {
    const question = draft.trim();
    if (!question || sending) return;

    let threadId = activeThreadId;

    // Auto-create thread if none exists
    if (!threadId) {
      const thread = await saveConversationThread(uid, productionId, {
        title: autoTitle(question),
        workingOn,
        lastMessageAt: new Date().toISOString(),
        archived: false,
      });
      setThreads((prev) => [thread, ...prev]);
      setActiveThreadId(thread.id);
      threadId = thread.id;
    }

    setSending(true);
    setError(null);
    setDraft("");

    const userMessage: CreativeMessage = {
      id: newId(), productionId, role: "user", content: question,
      mode, contextLabel: workingOn, createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    await saveThreadMessage(uid, productionId, threadId, userMessage);

    // Update thread title from first message if still default
    const thread = threads.find((t) => t.id === threadId);
    if (thread?.title === "New conversation" && messages.length === 0) {
      const updated = await saveConversationThread(uid, productionId, {
        ...thread,
        title: autoTitle(question),
        lastMessageAt: userMessage.createdAt,
      });
      setThreads((prev) => prev.map((t) => (t.id === threadId ? updated : t)));
    }

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
          contextLabel: workingOn,
          approvedCanon: approvedCanon.map(({ type, title, statement }) => ({ type, title, statement })),
          recentHistory: messages.slice(-14).map(({ role, content }) => ({ role, content })),
        }),
      });

      const data = await response.json() as CreativeRoomResponse & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Creative Room could not respond.");

      const created = data.responses.map((item, i): CreativeMessage => ({
        id: newId(), productionId, role: item.role, content: item.content,
        mode, contextLabel: workingOn, createdAt: new Date(Date.now() + i).toISOString(),
      }));
      setMessages((prev) => [...prev, ...created]);
      await Promise.all(created.map((m) => saveThreadMessage(uid, productionId, threadId!, m)));

      // Update thread lastMessageAt
      if (thread) {
        const last = created[created.length - 1];
        await saveConversationThread(uid, productionId, { ...thread, lastMessageAt: last.createdAt });
        setThreads((prev) => prev.map((t) => (t.id === threadId ? { ...t, lastMessageAt: last.createdAt } : t)));
      }

      // Silently detect decisions in background after every exchange
      void detectDecisions([...messages, userMessage, ...created]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Creative Room could not respond.");
    } finally {
      setSending(false);
    }
  }

  async function detectDecisions(currentMessages: CreativeMessage[]) {
    if (detecting) return;
    const recent = currentMessages.slice(-10);
    if (recent.filter((m) => m.role !== "user").length === 0) return;
    setDetecting(true);
    try {
      const token = await getIdToken();
      const response = await fetch("/api/creative-room/detect", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          recentMessages: recent.map(({ role, content }) => ({ role, content })),
          workingOn,
          existingCanon: approvedCanon.map(({ title, statement }) => ({ title, statement })),
        }),
      });
      if (!response.ok) return;
      const result = await response.json() as DetectDecisionsResult;
      if (result.proposals?.length > 0) {
        setProposals(result.proposals);
      }
    } catch {
      // Silent failure — detection is best-effort
    } finally {
      setDetecting(false);
    }
  }

  async function approveProposal(proposal: StoryDecisionProposal, statement?: string) {
    const record = await saveCanonRecord(uid, productionId, {
      productionId,
      type: (proposal.type as CanonType) ?? "world_detail",
      title: proposal.title,
      statement: statement ?? proposal.statement,
      status: "proposed",
      source: "Creative Room",
      proposedBy: "openai",
      approvedBy: null,
      canonVersion: "1.0",
      supersedes: null,
      dependencies: [],
      reviewNote: `Confidence: ${proposal.confidence}. Working on: ${workingOn}.`,
      contradictions: [],
    });
    setCanon((prev) => [...prev, record]);
    setProposals((prev) => prev.filter((p) => p.title !== proposal.title));
    if (proposals.length <= 1) setShowReview(false);
  }

  async function discardProposal(proposal: StoryDecisionProposal) {
    setProposals((prev) => prev.filter((p) => p.title !== proposal.title));
    if (proposals.length <= 1) setShowReview(false);
  }

  function toggleVoice() {
    if (isListening) {
      recognizerRef.current?.stop();
      recognizerRef.current = null;
      setIsListening(false);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Voice input is not supported in this browser.");
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const recognition = new SpeechRecognition() as {
      continuous: boolean;
      interimResults: boolean;
      lang: string;
      start: () => void;
      stop: () => void;
      onresult: (e: { results: ArrayLike<{ transcript: string }[]> & { length: number } }) => void;
      onend: () => void;
      onerror: () => void;
    };
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (e) => {
      const transcript = Array.from({ length: e.results.length }, (_, i) => e.results[i][0].transcript).join(" ");
      setDraft((prev) => (prev ? prev + " " + transcript : transcript));
    };
    recognition.onend = () => { recognizerRef.current = null; setIsListening(false); };
    recognition.onerror = () => { recognizerRef.current = null; setIsListening(false); };
    recognition.start();
    recognizerRef.current = recognition;
    setIsListening(true);
  }

  const filteredThreads = threads.filter((t) =>
    !threadSearch || t.title.toLowerCase().includes(threadSearch.toLowerCase())
  );

  return (
    <div className="flex h-full min-h-0 bg-zinc-950">
      {/* Thread sidebar */}
      <aside className="flex w-56 flex-shrink-0 flex-col border-r border-zinc-800">
        <div className="p-3 border-b border-zinc-800">
          <button
            onClick={() => void newThread()}
            className="w-full rounded-lg bg-amber-300 py-2 text-xs font-bold text-zinc-950 hover:bg-amber-200 transition-colors"
          >
            + New conversation
          </button>
          <input
            value={threadSearch}
            onChange={(e) => setThreadSearch(e.target.value)}
            placeholder="Search…"
            className="mt-2 w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-300 outline-none placeholder:text-zinc-600 focus:border-zinc-700"
          />
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {filteredThreads.length === 0 && (
            <p className="px-4 py-4 text-xs text-zinc-600">No conversations yet.</p>
          )}
          {filteredThreads.map((thread) => (
            <div key={thread.id} className="group relative">
              {renamingId === thread.id ? (
                <form
                  onSubmit={(e) => { e.preventDefault(); void renameThread(thread.id, renameValue); }}
                  className="px-3 py-2"
                >
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => void renameThread(thread.id, renameValue || thread.title)}
                    className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-100 outline-none"
                  />
                </form>
              ) : (
                <button
                  onClick={() => setActiveThreadId(thread.id)}
                  className={`w-full px-3 py-2.5 text-left transition ${
                    activeThreadId === thread.id
                      ? "bg-blue-500/10 text-zinc-100"
                      : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                  }`}
                >
                  <p className="truncate text-xs font-medium">{thread.title}</p>
                  <p className="mt-0.5 text-[10px] text-zinc-600">{thread.workingOn}</p>
                </button>
              )}
              {activeThreadId === thread.id && renamingId !== thread.id && (
                <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden gap-0.5 group-hover:flex">
                  <button
                    onClick={() => void branchThread()}
                    className="rounded p-1 text-zinc-600 hover:text-amber-400"
                    title="Branch conversation"
                  >
                    ⎇
                  </button>
                  <button
                    onClick={() => { setRenamingId(thread.id); setRenameValue(thread.title); }}
                    className="rounded p-1 text-zinc-600 hover:text-zinc-300"
                    title="Rename"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => void archiveThread(thread.id)}
                    className="rounded p-1 text-zinc-600 hover:text-red-400"
                    title="Archive"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-zinc-800 px-5 py-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Working on selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Working on</span>
                {activeThread ? (
                  <select
                    value={activeThread.workingOn}
                    onChange={(e) => void updateThreadWorkingOn(activeThread.id, e.target.value)}
                    className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 outline-none focus:border-zinc-700"
                  >
                    {WORKING_ON_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                    {!WORKING_ON_OPTIONS.includes(activeThread.workingOn) && (
                      <option value={activeThread.workingOn}>{activeThread.workingOn}</option>
                    )}
                  </select>
                ) : (
                  <select
                    value={workingOn}
                    onChange={(e) => setWorkingOn(e.target.value)}
                    className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 outline-none focus:border-zinc-700"
                  >
                    {WORKING_ON_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Model selector */}
              <div className="flex gap-1.5">
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                      mode === m.id
                        ? "border-amber-400/60 bg-amber-400/10 text-amber-200"
                        : "border-zinc-800 text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Detection indicator */}
          {proposals.length > 0 && (
            <button
              onClick={() => setShowReview(true)}
              className="flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-400/15 transition-colors"
            >
              ✨ {proposals.length} story decision{proposals.length !== 1 ? "s" : ""} detected
            </button>
          )}
          {detecting && proposals.length === 0 && (
            <span className="text-[10px] text-zinc-700">detecting…</span>
          )}
        </header>

        {/* Review panel */}
        {showReview && proposals.length > 0 && (
          <div className="border-b border-zinc-800 bg-zinc-900/60 px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-zinc-300">Story decisions detected — propose to canon?</p>
              <button onClick={() => setShowReview(false)} className="text-xs text-zinc-600 hover:text-zinc-400">Close</button>
            </div>
            <div className="space-y-2">
              {proposals.map((p) => (
                <div key={p.title} className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3">
                  <div className="flex items-start gap-2">
                    <span className={`mt-0.5 text-[10px] font-semibold uppercase rounded px-1.5 py-0.5 ${
                      p.confidence === "high" ? "bg-emerald-900/40 text-emerald-400" :
                      p.confidence === "medium" ? "bg-amber-900/40 text-amber-400" :
                      "bg-zinc-800 text-zinc-500"
                    }`}>{p.type}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-zinc-100">{p.title}</p>
                      {editingProposal === p.title ? (
                        <textarea
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          rows={2}
                          className="mt-1 w-full resize-none rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-200 outline-none"
                        />
                      ) : (
                        <p className="mt-0.5 text-xs text-zinc-400">{p.statement}</p>
                      )}
                      {p.sourceExcerpt && !editingProposal && (
                        <p className="mt-1 text-[10px] text-zinc-600 italic truncate">"{p.sourceExcerpt}"</p>
                      )}
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      {editingProposal === p.title ? (
                        <>
                          <button
                            onClick={() => { void approveProposal(p, editValue); setEditingProposal(null); }}
                            className="rounded bg-emerald-700 px-2 py-1 text-[10px] font-semibold text-white hover:bg-emerald-600"
                          >
                            Propose
                          </button>
                          <button
                            onClick={() => setEditingProposal(null)}
                            className="rounded border border-zinc-700 px-2 py-1 text-[10px] text-zinc-400 hover:text-zinc-200"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => void approveProposal(p)}
                            className="rounded bg-emerald-900/60 px-2 py-1 text-[10px] font-semibold text-emerald-300 hover:bg-emerald-800/60"
                          >
                            Propose
                          </button>
                          <button
                            onClick={() => { setEditingProposal(p.title); setEditValue(p.statement); }}
                            className="rounded border border-zinc-700 px-2 py-1 text-[10px] text-zinc-400 hover:text-zinc-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => void discardProposal(p)}
                            className="rounded border border-zinc-700 px-2 py-1 text-[10px] text-zinc-500 hover:text-red-400"
                          >
                            Skip
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-zinc-600">Proposed records go to Canon → Pending for your approval. Nothing is canon until you approve it.</p>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          {messages.length === 0 && (
            <div className="mx-auto max-w-lg rounded-xl border border-dashed border-zinc-800 p-8 text-center">
              <p className="text-sm font-medium text-zinc-300">
                {activeThread ? activeThread.title : "New conversation"}
              </p>
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                Just start talking. Change "Working on" to focus on a character or episode.
                Avrrio quietly watches for story decisions.
              </p>
            </div>
          )}
          {messages.map((message) => (
            <article key={message.id} className={`max-w-3xl ${message.role === "user" ? "ml-auto" : "mr-auto"}`}>
              <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                {ROLE_LABEL[message.role]}
              </div>
              <div
                className={`whitespace-pre-wrap rounded-xl border px-4 py-3 text-sm leading-6 ${
                  message.role === "user"
                    ? "border-amber-500/20 bg-amber-500/10 text-zinc-100"
                    : "border-zinc-800 bg-zinc-900 text-zinc-300"
                }`}
              >
                {message.content}
              </div>
            </article>
          ))}
          {sending && <p className="text-xs text-amber-300 animate-pulse">Thinking…</p>}
          {error && (
            <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">{error}</p>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Compose */}
        <footer className="border-t border-zinc-800 bg-zinc-950 p-4">
          <div className="flex items-end gap-3 rounded-xl border border-zinc-700 bg-zinc-900 p-3 focus-within:border-amber-500/40 transition-colors">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); }
              }}
              placeholder={`Talk about the story${activeThread?.workingOn && activeThread.workingOn !== "General" ? ` — ${activeThread.workingOn}` : ""}…`}
              className="min-h-12 flex-1 resize-none bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
            />
            <button
              type="button"
              onClick={toggleVoice}
              title={isListening ? "Stop recording" : "Speak your message"}
              className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                isListening
                  ? "border-red-500/40 bg-red-500/10 text-red-400 animate-pulse"
                  : "border-zinc-700 text-zinc-500 hover:text-zinc-300"
              }`}
            >
              🎙
            </button>
            <button
              disabled={!draft.trim() || sending}
              onClick={() => void sendMessage()}
              className="rounded-lg bg-amber-300 px-4 py-2 text-sm font-bold text-zinc-950 disabled:opacity-30 hover:bg-amber-200 transition-colors"
            >
              Send
            </button>
          </div>
          <p className="mt-2 text-[10px] text-zinc-700 text-center">
            {approvedCanon.length} canon facts in memory · {proposals.length > 0 ? `✨ ${proposals.length} detected` : "Avrrio watches for story decisions"}
          </p>
        </footer>
      </div>
    </div>
  );
}
