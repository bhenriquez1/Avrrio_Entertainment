"use client";

import { use } from "react";

const PROVIDERS = [
  { label: "OpenAI", role: "Creative reasoning & canon extraction", department: "Executive Producer", status: "check_env" },
  { label: "Claude", role: "Production direction & continuity review", department: "Production Director", status: "check_env" },
  { label: "Runway", role: "AI video generation", department: "Video Department", status: "not_configured" },
  { label: "ElevenLabs", role: "Voice synthesis", department: "Voice Department", status: "not_configured" },
  { label: "Blender Worker", role: "3D rendering pipeline", department: "3D Department", status: "not_configured" },
  { label: "Heyomi", role: "Multimodal production", department: "Multimodal Provider", status: "future" },
];

const STATUS_DOT: Record<string, string> = {
  ready: "bg-emerald-400",
  check_env: "bg-amber-400",
  not_configured: "bg-zinc-600",
  future: "bg-zinc-700",
};

const STATUS_LABEL: Record<string, string> = {
  ready: "Ready",
  check_env: "Configure API key",
  not_configured: "Not configured",
  future: "Future",
};

export default function AIStudioPage({ params }: { params: Promise<{ id: string }> }) {
  use(params);
  return (
    <main className="p-8 max-w-2xl">
      <h1 className="text-xl font-bold text-zinc-50 mb-1">AI Studio</h1>
      <p className="text-sm text-zinc-400 mb-8">Connected production agents and provider status.</p>
      <div className="space-y-1">
        {PROVIDERS.map((p) => (
          <div key={p.label} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-5 py-4">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-zinc-600 mb-0.5">{p.department}</p>
              <p className="text-sm font-semibold text-zinc-100">{p.label}</p>
              <p className="text-xs text-zinc-500">{p.role}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${STATUS_DOT[p.status] ?? "bg-zinc-600"}`} />
              <span className="text-xs text-zinc-400">{STATUS_LABEL[p.status] ?? p.status}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Required environment variables</p>
        <div className="space-y-1 font-mono text-xs text-zinc-400">
          <p>OPENAI_API_KEY=<span className="text-zinc-600">sk-…</span></p>
          <p>ANTHROPIC_API_KEY=<span className="text-zinc-600">sk-ant-…</span></p>
        </div>
        <p className="mt-3 text-xs text-zinc-600">API keys are server-side only — never exposed to the browser.</p>
      </div>
    </main>
  );
}
