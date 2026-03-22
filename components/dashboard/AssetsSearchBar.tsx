"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";

export default function AssetsSearchBar({ variant = "default" }: { variant?: "default" | "light" }) {
  const [query, setQuery] = useState("");

  const isLight = variant === "light";

  return (
    <div className="relative">
      <Search
        size={14}
        className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${isLight ? "text-white/60" : "text-slate-400"}`}
      />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search equipment…"
        className={
          isLight
            ? "pl-9 pr-8 py-2 text-sm bg-white/20 border border-white/30 rounded-xl w-56 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/50 transition-all placeholder:text-white/50 text-white backdrop-blur-sm"
            : "pl-9 pr-8 py-2 text-sm bg-white border border-slate-200 rounded-xl w-64 focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400 transition-all placeholder:text-slate-400 text-slate-800"
        }
      />
      {query && (
        <button
          onClick={() => setQuery("")}
          className={`absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors ${isLight ? "text-white/60 hover:text-white" : "text-slate-400 hover:text-slate-600"}`}
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}
