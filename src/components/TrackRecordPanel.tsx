
// ==========================
// File: src/components/TrackRecordPanel.tsx
// ==========================
import * as React from "react";
import ListCard from "../ListCard";

export type RunRow = {
  id: string;
  symbol: string;
  horizon: number;
  n_paths: number;
  q50?: number;
  probUp?: number;
  finishedAt?: string | number | Date;
};

type Props = {
  runs: RunRow[];
  maxHeight?: number | string; // optional: override height
  onRowClick?: (r: RunRow) => void; // optional: drill-down
};

export const TrackRecordPanel: React.FC<Props> = ({
  runs,
  maxHeight = 560,
  onRowClick,
}) => {
  const list = Array.isArray(runs) ? runs : [];

  return (
    <ListCard
      title="Track Record"
      subtitle={`Last ${list.length || 0} runs`}
      maxHeight={maxHeight}
      right={
        list.length > 0 ? (
          <button
            className="text-xs px-2 py-1 rounded border border-white/15 hover:bg-white/10"
            onClick={() => {
              const csv = [
                "id,symbol,horizon,n_paths,q50,probUp,finishedAt",
                ...list.map((r) =>
                  [
                    r.id,
                    r.symbol,
                    r.horizon,
                    r.n_paths,
                    Number.isFinite(r.q50 ?? NaN)
                      ? (r.q50 as number).toFixed(4)
                      : "",
                    Number.isFinite(r.probUp ?? NaN)
                      ? (r.probUp as number).toFixed(4)
                      : "",
                    r.finishedAt ? new Date(r.finishedAt).toISOString() : "",
                  ].join(",")
                ),
              ].join("\n");
              const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "track_record.csv";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export CSV
          </button>
        ) : null
      }
    >
      {list.length === 0 ? (
        <div className="px-4 py-6 text-xs text-white/70">No completed runs yet.</div>
      ) : (
        <ul className="divide-y divide-white/10">
          {list.map((r) => {
            const handleClick = () => onRowClick?.(r);
            return (
              <li
                key={r.id}
                role={onRowClick ? "button" : undefined}
                onClick={onRowClick ? handleClick : undefined}
                className={`px-3 py-2 text-xs flex items-center justify-between bg-black/40 hover:bg-white/10 transition-colors ${
                  onRowClick ? "cursor-pointer" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-white">{r.symbol}</span>
                  <span className="text-white/80">H{r.horizon}d</span>
                  <span className="text-white/60">
                    {Number.isFinite(r.n_paths)
                      ? r.n_paths.toLocaleString()
                      : "—"} paths
                  </span>
                </div>

                <div className="flex items-center gap-3 text-white/80">
                  <span className="tabular-nums">
                    q50: {" "}
                    {typeof r.q50 === "number" && Number.isFinite(r.q50)
                      ? r.q50.toFixed(2)
                      : "—"}
                  </span>
                  <span className="tabular-nums">
                    p(up): {" "}
                    {typeof r.probUp === "number" && Number.isFinite(r.probUp)
                      ? `${Math.round(r.probUp * 100)}%`
                      : "—"}
                  </span>
                  <span
                    className="text-white/60"
                    title={String(r.finishedAt ?? "")}
                  >
                    {r.finishedAt
                      ? new Date(r.finishedAt).toLocaleString()
                      : "—"}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </ListCard>
  );
};

export default TrackRecordPanel;
