import React from "react";

export type RunSummary = {
  id: string;
  symbol: string;
  horizon: number;
  n_paths: number;
  finishedAt: string;
  probUp?: number | null;
  q50?: number | null;
};

export default function RecentRunsRail({
  runs,
  onSelect,
}: {
  runs: RunSummary[];
  onSelect?: (r: RunSummary) => void;
}) {
  if (!runs?.length) {
    return (
      <div className="rounded-xl border border-[#2a2f36] bg-[#0f1318] px-3 py-2 text-xs opacity-70">
        No recent runs yet.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#2a2f36] bg-[#0f1318]">
      <div className="px-3 py-2 text-xs font-semibold text-white/70">Recent runs</div>

      <div className="relative">
        {/* Soft fade top/bottom using CSS mask */}
        <ul className="max-h-48 overflow-y-auto divide-y divide-white/5 [mask-image:linear-gradient(to_bottom,transparent,black_12px,black_calc(100%-12px),transparent)]">
          {runs.map((r) => (
            <li key={r.id}>
              <button
                className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-white/5 transition"
                onClick={() => onSelect?.(r)}
                title="Load this configuration"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{r.symbol}</span>
                  <span className="text-xs text-white/60">
                    {r.horizon}d • {r.n_paths.toLocaleString()} paths
                  </span>
                </div>
                <div className="text-xs text-white/60">
                  {typeof r.probUp === "number" ? `${Math.round(r.probUp * 100)}%` : ""}
                  <span className="ml-2 opacity-50">
                    {new Date(r.finishedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
