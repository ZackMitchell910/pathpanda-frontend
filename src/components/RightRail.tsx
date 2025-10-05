// src/components/RightRail.tsx
import React from "react";

type SimItem = {
  title: string;   // e.g., "NVDA • 30d"
  subtitle?: string; // e.g., "1,000 paths"
  onClick?: () => void;
};

export function RightRail({
  quickSims,
  recent,
  className = "",
  maxHeight = "70vh", // tweak as needed
}: {
  quickSims: SimItem[];
  recent: SimItem[];
  className?: string;
  /** any valid CSS height (vh/px/rem/etc.) */
  maxHeight?: string;
}) {
  return (
    <aside className={`md:w-80 w-full ${className}`}>
      <div className="rounded-2xl border border-[#1B2431] bg-[#0E141C] overflow-hidden">
        {/* Sticky rail header */}
        <div className="px-4 py-3 text-sm font-medium border-b border-[#1B2431] bg-[#131A23] sticky top-0 z-10">
          Quick Sims
        </div>

        {/* Scrollable content area */}
        <div
          className="overflow-y-auto pr-2 thin-scroll"
          style={{ maxHeight }}
        >
          <ul className="p-3 space-y-2">
            {quickSims.map((item, i) => (
              <li key={`q-${i}`}>
                <button
                  onClick={item.onClick}
                  className="w-full text-left rounded-xl bg-[#121923] border border-[#273141] px-4 py-3 hover:bg-[#172133] transition-colors"
                >
                  <div className="text-sm font-medium text-zinc-100">
                    {item.title}
                  </div>
                  {item.subtitle && (
                    <div className="text-xs text-zinc-400">{item.subtitle}</div>
                  )}
                </button>
              </li>
            ))}
          </ul>

          {/* Section divider / label */}
          <div className="px-4 pt-2 pb-2 text-xs font-semibold text-zinc-400">
            Recent
          </div>

          <ul className="px-3 pb-3 space-y-2">
            {recent.map((item, i) => (
              <li key={`r-${i}`}>
                <button
                  onClick={item.onClick}
                  className="w-full text-left rounded-xl bg-[#121923] border border-[#273141] px-4 py-3 hover:bg-[#172133] transition-colors"
                >
                  <div className="text-sm font-medium text-zinc-100">
                    {item.title}
                  </div>
                  {item.subtitle && (
                    <div className="text-xs text-zinc-400">{item.subtitle}</div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}

export default RightRail;
