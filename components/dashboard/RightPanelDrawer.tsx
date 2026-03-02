"use client";

import { useState } from "react";
import { X, LayoutList } from "lucide-react";
import ScanFeed from "./ScanFeed";
import DepartmentsPanel from "./DepartmentsPanel";

export default function RightPanelDrawer() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating trigger button — only visible below xl */}
      <button
        onClick={() => setOpen(true)}
        className="xl:hidden fixed bottom-20 right-5 z-40 flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-2xl shadow-xl hover:bg-indigo-600 transition-colors"
      >
        <LayoutList size={15} />
        Live Feed
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="xl:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer panel — slides in from the right */}
      <div
        className={`xl:hidden fixed top-0 right-0 h-full z-50 w-80 max-w-[90vw] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-semibold text-slate-800">Live Feed & Departments</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <ScanFeed />
          <DepartmentsPanel />
        </div>
      </div>
    </>
  );
}
