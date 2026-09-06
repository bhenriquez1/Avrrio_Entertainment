"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/firebase/AuthProvider";
import { getProduction } from "@/lib/production/repository";

const SECTIONS = [
  {
    label: "Create",
    items: [
      ["Creative Room", "/creative-room"],
      ["Characters", "/characters"],
      ["Story", "/story-bible"],
      ["World", "/world"],
      ["Locations", "/locations"],
    ],
  },
  {
    label: "Structure",
    items: [
      ["Seasons", "/seasons"],
      ["Episodes", "/episodes"],
      ["Timeline", "/timeline"],
      ["Scripts", "/scripts"],
      ["Scenes", "/scenes"],
      ["Shots", "/shots"],
    ],
  },
  {
    label: "Production",
    items: [
      ["Visual Development", "/assets"],
      ["Voices", "/voices"],
      ["Storyboards", "/storyboards"],
      ["Production Queue", "/production-queue"],
      ["Review", "/qa"],
      ["AI Studio", "/ai-studio"],
    ],
  },
  {
    label: "Memory",
    items: [
      ["Canon & Continuity", "/canon"],
      ["Relationships", "/memory/relationships"],
      ["Powers & Rules", "/memory/powers-rules"],
      ["Secrets", "/memory/secrets"],
      ["Foreshadowing", "/memory/foreshadowing"],
      ["Ideas", "/memory/ideas"],
    ],
  },
  {
    label: "Distribution",
    items: [
      ["YouTube", "/youtube"],
    ],
  },
] as const;

export function Sidebar({ productionId }: { productionId: string; productionTitle?: string }) {
  const pathname = usePathname();
  const { uid, status } = useAuth();
  const [title, setTitle] = useState<string | null>(null);
  const base = `/production/${productionId}`;

  useEffect(() => {
    if (status !== "allowed" || !uid) return;
    getProduction(uid, productionId).then((prod) => {
      if (prod?.title) setTitle(prod.title);
    }).catch(() => {});
  }, [uid, productionId, status]);

  return (
    <aside className="avrrio-sidebar flex w-56 flex-shrink-0 flex-col border-r border-blue-200/10 bg-[#070b18]">
      <div className="border-b border-blue-200/10 px-4 py-4">
        <Link href={base}>
          <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-amber-300/70">Active Production</p>
          <p className="mt-1 truncate text-sm font-semibold text-slate-50">
            {title ?? <span className="opacity-30">Loading…</span>}
          </p>
          <p className="mt-1 text-[10px] text-blue-200/35">Story Memory connected</p>
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {SECTIONS.map((section) => (
          <section key={section.label} className="mt-4 first:mt-0">
            <p className="px-3 pb-1.5 text-[9px] font-bold uppercase tracking-[0.24em] text-blue-200/30">{section.label}</p>
            {section.items.map(([label, path]) => {
              const href = `${base}${path}`;
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={`${section.label}-${path}`}
                  href={href}
                  className={`block rounded-lg px-3 py-1.5 text-[13px] transition ${
                    active
                      ? "bg-gradient-to-r from-blue-500/15 to-amber-400/5 text-amber-200 ring-1 ring-inset ring-amber-300/10"
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </section>
        ))}
      </nav>
      <div className="border-t border-blue-200/10 px-4 py-4">
        <Link href="/studio/brand" className="block text-xs text-blue-200/45 hover:text-amber-200">Studio Identity</Link>
        <Link href="/studio" className="mt-2 block text-xs text-blue-200/35 hover:text-slate-200">← All productions</Link>
      </div>
    </aside>
  );
}
