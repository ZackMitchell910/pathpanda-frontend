// src/components/TrackRecordPanel.tsx
import React from "react";

type RunSummary = {
  id: string;
  symbol: string;
  horizon: number;
  n_paths: number;
  finishedAt: string; // ISO string
  q50?: number | null;
  probUp?: number | null; // 0..1
};

interface Props {
  runs?: RunSummary[] | null;
}

export const TrackRecordPanel: React.FC<Props> = ({ runs }) => {
  const list = Array.isArray(runs) ? runs : [];

  if (!list.length) {
    return <div className="text-xs opacity-70">No completed runs yet.</div>;
  }

  return (
    <div className="space-y-2">
      {list.map((r) => (
        <div
          key={r.id}
          className="flex items-center justify-between rounded-md bg-[#13161a] border border-[#23262b] px-3 py-2 text-xs"
        >
          <div className="flex items-center gap-3">
            <span className="font-mono">{r.symbol}</span>
            <span>H{r.horizon}d</span>
            <span>{Number.isFinite(r.n_paths) ? r.n_paths.toLocaleString() : "—"} paths</span>
          </div>
          <div className="flex items-center gap-3 opacity-80">
            <span>
              q50: {typeof r.q50 === "number" && Number.isFinite(r.q50) ? r.q50.toFixed(2) : "—"}
            </span>
            <span>
              p(up):{" "}
              {typeof r.probUp === "number" && Number.isFinite(r.probUp)
                ? `${Math.round(r.probUp * 100)}%`
                : "—"}
            </span>
            <span title={r.finishedAt}>
              {r.finishedAt ? new Date(r.finishedAt).toLocaleString() : "—"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
