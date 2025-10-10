// src/components/RightRail.tsx
import React from "react";

type Item = { title: string; subtitle?: string; onClick?: () => void };

type Props = {
  recent?: Item[] | null;
  className?: string;
  /** any valid CSS height */
  maxHeight?: string;
};

const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

export default function RightRail({ recent, className = "", maxHeight = "70vh" }: Props) {
  const recentList = asArray<Item>(recent);

  return (
    <aside className={`md:w-80 w-full ${className}`}>
      <div className="rounded-2xl border border-[#1B2431] bg-[#0E141C] overflow-hidden">
        <div className="px-4 py-3 text-sm font-medium border-b border-[#1B2431] bg-[#131A23] sticky top-0 z-10">
          Recent Runs
        </div>
        <div className="overflow-y-auto pr-2 thin-scroll" style={{ maxHeight }}>
          <ul className="px-3 py-3 space-y-2">
            {recentList.length === 0 && (
              <li className="text-xs text-zinc-400 px-1">No recent runs yet.</li>
            )}
            {recentList.map((item, i) => (
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
          </ul>
        </div>
      </div>
    </aside>
  );
}
