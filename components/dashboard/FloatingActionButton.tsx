"use client";

import { Plus } from "lucide-react";

export default function FloatingActionButton() {
  return (
    <button
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-sm font-semibold rounded-2xl shadow-xl shadow-indigo-500/40 hover:shadow-indigo-500/60 hover:scale-105 active:scale-95 transition-all duration-200"
      aria-label="Add Equipment"
    >
      <Plus size={18} strokeWidth={2.5} />
      <span>Add Equipment</span>
    </button>
  );
}
