import * as React from "react";
import ListCard from "./ListCard";

export type TargetRow = {
  label: string;        // e.g. "-10%", "+20%", "$240"
  price: number;        // absolute price level
  hitEver?: number;     // probability (0..1) of intra-horizon touch
  hitByEnd?: number;    // probability (0..1) of closing >= level by horizon
  tMedDays?: number;    // median days-to-hit (if hit)
};

type Props = {
  spot: number;
  horizonDays: number;
  rows: TargetRow[];
};

const fmtPct = (n?: number) =>
  Number.isFinite(n as number) ? `${Math.round((n as number) * 100)}%` : "—";

function ProbCell({ p }: { p?: number }) {
  if (!Number.isFinite(p as number)) return <span className="opacity-70">—</span>;
  const pc = Math.max(0, Math.min(1, p as number)) * 100;
  return (
    <div className="relative">
      <div className="absolute inset-y-0 right-0 left-0 rounded-sm bg-white/5" />
      <div
        className="absolute inset-y-0 left-0 rounded-sm bg-white/20"
        style={{ width: `${pc}%` }}
      />
      <span className="relative tabular-nums">{Math.round(pc)}%</span>
    </div>
  );
}

export default function TargetsAndOdds({ spot, horizonDays, rows }: Props) {
  return (
    <ListCard
      title="Targets & Odds"
      subtitle={
        <span>
          Spot <span className="tabular-nums">${spot.toFixed(2)}</span> • Horizon {horizonDays}d
        </span>
      }
      maxHeight={340}
    >
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-[#0f1216] text-zinc-400">
          <tr className="[&>th]:py-2 [&>th]:px-4 text-left">
            <th>Target</th>
            <th className="text-right">Price</th>
            <th className="text-right">Hit (ever)</th>
            <th className="text-right">Hit by end</th>
            <th className="text-right">Med. days-to-hit</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/70">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-zinc-400">
                No targets available for this run.
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr key={i} className="[&>td]:py-2 [&>td]:px-4">
                <td className="text-zinc-200">{r.label}</td>
                <td className="text-right tabular-nums">${r.price.toFixed(2)}</td>
                <td className="text-right"><ProbCell p={r.hitEver} /></td>
                <td className="text-right"><ProbCell p={r.hitByEnd} /></td>
                <td className="text-right">{Number.isFinite(r.tMedDays as number) ? r.tMedDays : "—"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </ListCard>
  );
}
