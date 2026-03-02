"use client";

import { ChevronDown } from "lucide-react";
import { inventoryData } from "@/lib/data";
import clsx from "clsx";

export default function InventoryOverview() {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-800">
          Inventory Accuracy
        </h3>
        <button className="flex items-center gap-1 text-xs text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
          Restock in {inventoryData.restockDue} <ChevronDown size={12} />
        </button>
      </div>

      {/* Big percentage */}
      <div className="flex items-end gap-2 mb-4">
        <span className="text-5xl font-bold text-slate-900">
          {inventoryData.accuracy}
          <span className="text-2xl text-slate-400">%</span>
        </span>
        <span className="text-xs text-slate-400 mb-2">inventory accuracy</span>
      </div>

      {/* Stacked bar */}
      <div className="flex rounded-full overflow-hidden h-3 mb-4 gap-0.5">
        {inventoryData.breakdown.map((item) => (
          <div
            key={item.label}
            className="h-full transition-all"
            style={{ width: `${item.value}%`, backgroundColor: item.color }}
          />
        ))}
      </div>

      {/* Labels */}
      <div className="flex gap-3 flex-wrap">
        {inventoryData.breakdown.map((item) => (
          <button
            key={item.label}
            className={clsx(
              "flex-1 min-w-0 py-2.5 px-3 rounded-xl text-center text-xs font-semibold transition-all",
              item.label === "Fully Stocked"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            <span className="block text-sm font-bold">{item.value}%</span>
            <span className="block text-xs opacity-80 mt-0.5 truncate">
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
