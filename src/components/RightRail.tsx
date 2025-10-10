// src/components/RightRail.tsx
import React from "react";

type SimItem = {
  title: string;
  subtitle?: string;
  onClick?: () => void;
};

export default function RightRail({
  recent,
  className = "",
  maxHeight = "70vh",
}: {
  recent: SimItem[];
  className?: string;
  maxHeight?: string;
}) {
  return (
    <aside className={`md:w-80 w-full ${className}`}>
      <div className="rounded-2xl border border-[#1B2431] bg-[#0E141C] overflow-hidden">
        <div className="px-4 py-3 text-sm font-medium border-b border-[#1B2431] bg-[#131A23] sticky top-0 z-10">
          Recent runs
        </div>
        <div className="overflow-y-auto pr-2 thin-scroll" style={{ maxHeight }}>
          <ul className="px-3 py-3 space-y-2">
            {recent.map((item, i) => (
              <li key={`r-${i}`}>
                <button
                  onClick={item.onClick}
                  className="w-full text-left rounded-xl bg-[#121923] border border-[#273141] px-4 py-3 hover:bg-[#172133] transition-colors"
                >
                  <div className="text-sm font-medium text-zinc-100">{item.title}</div>
                  {item.subtitle && <div className="text-xs text-zinc-400">{item.subtitle}</div>}
                </button>
              </li>
            ))}
            {recent.length === 0 && (
              <li className="text-xs text-zinc-400 px-4 py-2">No runs yet — run a simulation to see history here.</li>
            )}
          </ul>
        </div>
      </div>
    </aside>
  );
}
