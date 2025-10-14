// ==========================
// File: src/components/RightRail.tsx
// ==========================
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
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden">
        <div className="px-4 py-3 text-sm font-medium border-b border-white/10 bg-black/60 sticky top-0 z-10">
          Recent runs
        </div>
        <div className="overflow-y-auto pr-2 thin-scroll" style={{ maxHeight }}>
          <ul className="px-3 py-3 space-y-2">
            {recent.map((item, i) => (
              <li key={`r-${i}`}>
                <button
                  onClick={item.onClick}
                  className="w-full text-left rounded-xl bg-black/40 border border-white/10 px-4 py-3 hover:bg-white/10 transition-colors"
                >
                  <div className="text-sm font-medium text-white">{item.title}</div>
                  {item.subtitle && <div className="text-xs text-white/60">{item.subtitle}</div>}
                </button>
              </li>
            ))}
            {recent.length === 0 && (
              <li className="text-xs text-white/60 px-4 py-2">No runs yet — run a simulation to see history here.</li>
            )}
          </ul>
        </div>
      </div>
    </aside>
  );
}

