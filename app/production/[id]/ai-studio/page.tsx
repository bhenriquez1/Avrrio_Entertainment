"use client";

import { use, useEffect, useState } from "react";

const PROVIDERS = [
  { id: "openai", label: "OpenAI", role: "Creative reasoning & canon extraction", department: "Executive Producer", status: "checking" },
  { id: "claude", label: "Claude", role: "Production direction & continuity review", department: "Production Director", status: "checking" },
  { id: "runway", label: "Runway", role: "AI video generation", department: "Video Department", status: "checking" },
  { id: "kling", label: "Kling", role: "AI video generation", department: "Video Department", status: "checking" },
  { id: "elevenlabs", label: "ElevenLabs", role: "Voice synthesis", department: "Voice Department", status: "checking" },
  { id: "blender", label: "Blender Worker", role: "3D rendering pipeline", department: "3D Department", status: "checking" },
];

const STATUS_DOT: Record<string, string> = {
  ready: "bg-emerald-400",
  checking: "bg-amber-400 animate-pulse",
  check_env: "bg-amber-400",
  not_configured: "bg-zinc-600",
  future: "bg-zinc-700",
};

const STATUS_LABEL: Record<string, string> = {
  ready: "Ready",
  checking: "Checking…",
  check_env: "Configure API key",
  not_configured: "Not configured",
  future: "Future",
};

export default function AIStudioPage({ params }: { params: Promise<{ id: string }> }) {
  use(params);
  const [providerStatus, setProviderStatus] = useState<Record<string, boolean> | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/ai/status", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Unable to check AI providers.");
        return response.json();
      })
      .then((status) => {
        if (active) setProviderStatus(status);
      })
      .catch(() => {
        if (active) setProviderStatus({ openai: false, claude: false });
      });
    return () => { active = false; };
  }, []);

  return (
    <main className="p-8 max-w-2xl">
      <h1 className="text-xl font-bold text-zinc-50 mb-1">AI Studio</h1>
      <p className="text-sm text-zinc-400 mb-8">Connected production agents and provider status.</p>
      <div className="space-y-1">
        {PROVIDERS.map((p) => {
          const status = providerStatus === null
            ? "checking"
            : providerStatus[p.id]
              ? "ready"
              : "check_env";
          return (
          <div key={p.label} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-5 py-4">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-zinc-600 mb-0.5">{p.department}</p>
              <p className="text-sm font-semibold text-zinc-100">{p.label}</p>
              <p className="text-xs text-zinc-500">{p.role}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${STATUS_DOT[status] ?? "bg-zinc-600"}`} />
              <span className="text-xs text-zinc-400">{STATUS_LABEL[status] ?? status}</span>
            </div>
          </div>
          );
        })}
      </div>
      <div className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Required environment variables</p>
        <div className="space-y-1 font-mono text-xs text-zinc-400">
          <p>OPENAI_API_KEY=<span className="text-zinc-600">sk-…</span></p>
          <p>ANTHROPIC_API_KEY=<span className="text-zinc-600">sk-ant-…</span></p>
          <p>RUNWAY_API_KEY=<span className="text-zinc-600">key_…</span></p>
          <p>KLING_API_KEY=<span className="text-zinc-600">••••</span></p>
          <p>ELEVENLABS_API_KEY=<span className="text-zinc-600">••••</span></p>
          <p>BLENDER_WORKER_URL / BLENDER_WORKER_TOKEN=<span className="text-zinc-600">••••</span></p>
        </div>
        <p className="mt-3 text-xs text-zinc-600">API keys are server-side only — never exposed to the browser.</p>
      </div>
    </main>
  );
}
