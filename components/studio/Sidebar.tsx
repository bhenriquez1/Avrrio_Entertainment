"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const SECTIONS = [
  { label: "Story", items: [["Story Bible", "/story-bible"], ["Characters", "/characters"], ["Relationships", "/memory/relationships"], ["Timeline", "/timeline"], ["Powers & Rules", "/memory/powers-rules"], ["Locations", "/locations"], ["Secrets", "/memory/secrets"], ["Foreshadowing", "/memory/foreshadowing"], ["Ideas", "/memory/ideas"], ["Canon Decisions", "/canon"]] },
  { label: "Structure", items: [["Seasons", "/seasons"], ["Episodes", "/episodes"], ["Scripts", "/scripts"], ["Scenes", "/scenes"], ["Shots", "/shots"]] },
  { label: "Production", items: [["Assets", "/assets"], ["Voices", "/voices"], ["Production Queue", "/production-queue"], ["Quality Review", "/qa"]] },
  { label: "Intelligence", items: [["Creative Room", "/creative-room"], ["AI Providers", "/ai-studio"]] },
] as const;

export function Sidebar({ productionId, productionTitle }: { productionId: string; productionTitle: string }) {
  const pathname = usePathname();
  const base = `/production/${productionId}`;
  return <aside className="avrrio-sidebar flex w-60 flex-shrink-0 flex-col border-r border-blue-200/10 bg-[#070b18]">
    <div className="border-b border-blue-200/10 px-5 py-5"><Link href={base}><p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-amber-300/70">Active Production</p><p className="mt-1 truncate text-sm font-semibold text-slate-50">{productionTitle}</p><p className="mt-1 text-[10px] text-blue-200/35">Story Memory connected</p></Link></div>
    <nav className="flex-1 overflow-y-auto px-3 py-3">
      <Link href={base} className={`mb-2 block rounded-lg px-3 py-2 text-[13px] ${pathname === base ? "bg-blue-400/10 text-amber-200" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>Overview</Link>
      {SECTIONS.map((section) => <section key={section.label} className="mt-5"><p className="px-3 pb-1.5 text-[9px] font-bold uppercase tracking-[0.24em] text-blue-200/30">{section.label}</p>{section.items.map(([label, path]) => { const href = `${base}${path}`; const active = pathname.startsWith(href); return <Link key={path} href={href} className={`block rounded-lg px-3 py-1.5 text-[13px] transition ${active ? "bg-gradient-to-r from-blue-500/15 to-amber-400/5 text-amber-200 ring-1 ring-inset ring-amber-300/10" : "text-slate-400 hover:bg-white/5 hover:text-slate-100"}`}>{label}</Link>; })}</section>)}
    </nav>
    <div className="border-t border-blue-200/10 px-5 py-4"><Link href="/studio/brand" className="block text-xs text-blue-200/45 hover:text-amber-200">Studio Identity</Link><Link href="/studio" className="mt-2 block text-xs text-blue-200/35 hover:text-slate-200">← All productions</Link></div>
  </aside>;
}
