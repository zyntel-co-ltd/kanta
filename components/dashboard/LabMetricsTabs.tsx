"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock, Beaker, Hash, Database, DollarSign, TrendingUp } from "lucide-react";

const TABS = [
  { label: "TAT",         href: "/dashboard/tat",         icon: Clock       },
  { label: "Tests",       href: "/dashboard/tests",       icon: Beaker      },
  { label: "Numbers",     href: "/dashboard/numbers",     icon: Hash        },
  { label: "Meta",        href: "/dashboard/meta",        icon: Database    },
  { label: "Revenue",     href: "/dashboard/revenue",     icon: DollarSign  },
  { label: "Performance", href: "/dashboard/performance", icon: TrendingUp  },
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
            <Icon size={14} strokeWidth={1.8} />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
