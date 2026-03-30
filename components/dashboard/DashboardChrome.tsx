"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import Sidebar from "@/components/dashboard/Sidebar";
import TopBar from "@/components/dashboard/TopBar";
import AppTabBar from "@/components/dashboard/AppTabBar";
import FloatingActionButton from "@/components/dashboard/FloatingActionButton";
import Tooltip from "@/components/ui/Tooltip";
import { useSidebarLayout } from "@/lib/SidebarLayoutContext";
import { ArrowLeft } from "lucide-react";

function SidebarCollapseGlyph({ sidebarExpanded }: { sidebarExpanded: boolean }) {
  return (
    <span
      className={clsx(
        "flex h-8 w-8 items-stretch overflow-hidden rounded-[10px] shadow-sm ring-1 ring-slate-900/12",
        !sidebarExpanded && "scale-x-[-1]"
      )}
      aria-hidden
    >
      <span className="flex min-w-0 flex-1 items-center justify-center bg-[var(--sidebar-active-bg)]">
        <ArrowLeft className="h-3.5 w-3.5 shrink-0 text-white" strokeWidth={2.5} />
      </span>
      <span className="flex w-[8px] shrink-0 flex-col items-center justify-center gap-[3px] bg-white py-1">
        <span className="h-[3px] w-[3px] rounded-full bg-[var(--sidebar-active-bg)]" />
        <span className="h-[3px] w-[3px] rounded-full bg-[var(--sidebar-active-bg)]" />
        <span className="h-[3px] w-[3px] rounded-full bg-[var(--sidebar-active-bg)]" />
      </span>
    </span>
  );
}

/**
 * Standard dashboard chrome (sidebar + top bar + padded main).
 */
export default function DashboardChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showAssetManagementFab =
    pathname === "/dashboard/assets" || pathname === "/dashboard/equipment";
  const { collapsed, setCollapsed } = useSidebarLayout();

  return (
    <>
      {/* Isolate sidebar column so the collapse control (-right-3.5) isn’t clipped by flex/min-width quirks; aside stays overflow-visible */}
      <div className="relative z-30 flex h-full min-h-0 flex-shrink-0 overflow-visible">
        <Tooltip label={collapsed ? "Expand sidebar" : "Collapse sidebar"} side="right">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={clsx(
              // Positioned along the right edge near the header band (matches the ref pill).
              "absolute -right-2.5 top-[72px] -translate-y-1/2 z-50 flex items-center justify-center rounded-[12px] p-0",
              "border-0 bg-transparent shadow-none",
              "transition-transform duration-200 hover:scale-[1.06] active:scale-[0.96]",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sidebar-active-bg)] focus-visible:ring-offset-2"
            )}
          >
            <SidebarCollapseGlyph sidebarExpanded={!collapsed} />
          </button>
        </Tooltip>
        <Suspense
          fallback={
            <aside
              className="relative flex flex-col h-screen flex-shrink-0 w-[260px] overflow-visible border-r border-slate-200 bg-white"
              style={{ borderRadius: "0 28px 28px 0" }}
              aria-hidden
            />
          }
        >
          <Sidebar />
        </Suspense>
      </div>

      <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
        <TopBar />
        <AppTabBar />
        <main
          className="flex-1 overflow-y-auto p-6"
          style={{ backgroundColor: "var(--surface-page, #f8fafc)" }}
        >
          {children}
        </main>
        {showAssetManagementFab && <FloatingActionButton />}
      </div>
    </>
  );
}
