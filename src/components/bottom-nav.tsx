"use client";

import Link from "next/link";
import { CalendarDays, CheckCircle2, Sparkles } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";

const items = [
  { href: "/app", label: "Today", icon: Sparkles, key: "today" },
  {
    href: "/app?tab=upcoming",
    label: "Upcoming",
    icon: CalendarDays,
    key: "upcoming",
  },
  { href: "/app/history", label: "Done", icon: CheckCircle2, key: "done" },
];

export function BottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab");

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-blue-200/10 bg-[#05070c]/88 px-4 py-3 backdrop-blur-xl">
      <div className="mx-auto grid max-w-md grid-cols-3 gap-2 rounded-[8px] border border-white/10 bg-white/[0.035] p-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            (item.key === "today" && pathname === "/app" && !activeTab) ||
            (pathname === "/app" && activeTab === item.key) ||
            (item.key === "done" && pathname === "/app/history");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                active
                  ? "flex items-center justify-center gap-1.5 rounded-[7px] bg-blue-300/15 px-2 py-3 text-xs font-semibold text-blue-100 shadow-[0_0_24px_rgba(88,173,255,0.18)]"
                  : "flex items-center justify-center gap-1.5 rounded-[7px] px-2 py-3 text-xs font-semibold text-slate-500"
              }
            >
              <Icon size={15} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
