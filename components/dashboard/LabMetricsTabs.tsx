"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Timer,
  Microscope,
  Binary,
  TableProperties,
  CircleDollarSign,
  ChartSpline,
} from "lucide-react";

const TABS = [
  { label: "TAT",         href: "/dashboard/tat",         icon: Timer             },
  { label: "Tests",       href: "/dashboard/tests",       icon: Microscope        },
  { label: "Numbers",     href: "/dashboard/numbers",     icon: Binary            },
  { label: "Meta",        href: "/dashboard/meta",        icon: TableProperties   },
  { label: "Revenue",     href: "/dashboard/revenue",     icon: CircleDollarSign  },
  { label: "Performance", href: "/dashboard/performance", icon: ChartSpline       },
];

export default function LabMetricsTabs() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {TABS.map(({ label, href, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
              active
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
            }`}
          >
            <Icon size={15} strokeWidth={2} className="opacity-95" />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
