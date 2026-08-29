"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { label: "Overview", href: "", group: null },
  { label: "Story Bible", href: "/story-bible", group: null },
  { label: "Characters", href: "/characters", group: null },
  { label: "World", href: "/world", group: null },
  { label: "Timeline", href: "/timeline", group: null },
  { label: "Seasons", href: "/seasons", group: "Structure" },
  { label: "Episodes", href: "/episodes", group: "Structure" },
  { label: "Scripts", href: "/scripts", group: "Structure" },
  { label: "Scenes", href: "/scenes", group: "Structure" },
  { label: "Shots", href: "/shots", group: "Structure" },
  { label: "Assets", href: "/assets", group: "Production" },
  { label: "Voices", href: "/voices", group: "Production" },
  { label: "Locations", href: "/locations", group: "Production" },
  { label: "AI Studio", href: "/ai-studio", group: "Intelligence" },
  { label: "Production", href: "/production-queue", group: "Intelligence" },
  { label: "QA", href: "/qa", group: "Intelligence" },
];

export function Sidebar({ productionId, productionTitle }: { productionId: string; productionTitle: string }) {
  const pathname = usePathname();
  const base = `/production/${productionId}`;

  let lastGroup: string | null | undefined = undefined;

  return (
    <aside className="flex w-52 flex-shrink-0 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="border-b border-zinc-800 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Production</p>
        <p className="mt-0.5 truncate text-sm font-semibold text-zinc-100">{productionTitle}</p>
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV.map((item) => {
          const showGroupHeader = item.group !== lastGroup && item.group !== null;
          lastGroup = item.group;
          const href = item.href === "" ? base : `${base}${item.href}`;
          const active = item.href === "" ? pathname === base : pathname.startsWith(href);
          return (
            <div key={item.href}>
              {showGroupHeader && (
                <p className="mt-3 px-4 pb-1 text-[9px] font-semibold uppercase tracking-widest text-zinc-600">
                  {item.group}
                </p>
              )}
              <Link
                href={href}
                className={`block px-4 py-1.5 text-sm transition-colors ${
                  active
                    ? "bg-zinc-800 text-zinc-50"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                }`}
              >
                {item.label}
              </Link>
            </div>
          );
        })}
      </nav>
      <div className="border-t border-zinc-800 px-4 py-3">
        <Link href="/studio" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          ← All Productions
        </Link>
      </div>
    </aside>
  );
}
