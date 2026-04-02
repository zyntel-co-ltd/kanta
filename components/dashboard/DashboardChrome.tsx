"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import TopBar from "@/components/dashboard/TopBar";
import AppTabBar from "@/components/dashboard/AppTabBar";
import FloatingActionButton from "@/components/dashboard/FloatingActionButton";
import { useSidebarLayout } from "@/lib/SidebarLayoutContext";

/**
 * Standard dashboard chrome (sidebar + top bar + padded main).
 */
export default function DashboardChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { aiPanelOpen } = useSidebarLayout();
  const showAssetManagementFab =
    pathname === "/dashboard/assets" || pathname === "/dashboard/equipment";
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const set = () => setIsMobile(window.innerWidth < 640);
    set();
    window.addEventListener("resize", set);
    return () => window.removeEventListener("resize", set);
  }, []);

  const pushStyle = {
    marginRight: !isMobile && aiPanelOpen ? "380px" : 0,
    transition: "margin-right 300ms ease-in-out",
  } as const;

  return (
    <>
      {/* Isolate sidebar column so the collapse control (-right-3.5) isn’t clipped by flex/min-width quirks; aside stays overflow-visible */}
      <div className="relative z-30 flex h-full min-h-0 flex-shrink-0 overflow-visible">
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

      <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden" style={pushStyle}>
        <TopBar />
        <AppTabBar />
        <main
          className="flex-1 overflow-y-auto p-6"
          style={{ ...pushStyle, backgroundColor: "var(--surface-page, #f8fafc)" }}
        >
          {children}
        </main>
        {showAssetManagementFab && <FloatingActionButton />}
      </div>
    </>
  );
}
