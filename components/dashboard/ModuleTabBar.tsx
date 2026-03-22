"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import clsx from "clsx";
import type { ComponentType } from "react";

export type ModuleTab = {
  label: string;
  href: string;
  icon?: ComponentType<{ size?: number; className?: string }>;
  /** If true, match href including search params (e.g. ?tab=lj) */
  exactMatch?: boolean;
};

type Props = {
  tabs: ModuleTab[];
  className?: string;
};

export default function ModuleTabBar({ tabs, className }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function isActive(tab: ModuleTab) {
    const [base, qs] = tab.href.split("?");
    if (qs) {
      const tabParam = new URLSearchParams(qs).get("tab");
      return pathname === base && searchParams.get("tab") === tabParam;
    }
    if (tab.exactMatch) return pathname === base;
    return pathname === base || pathname.startsWith(base + "/");
  }

  return (
    <nav
      className={clsx(
        "flex items-center gap-1 overflow-x-auto scrollbar-hide",
        "border-b border-slate-200 bg-white px-4",
        className
      )}
    >
      {tabs.map((tab) => {
        const active = isActive(tab);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={clsx(
              "flex items-center gap-1.5 whitespace-nowrap px-3 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
              active
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            )}
          >
            {Icon && <Icon size={14} className={active ? "text-emerald-600" : "text-slate-400"} />}
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
