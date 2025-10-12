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
  rows: TargetRow[];    // precomputed by backend or parent
};

function pct(n?: number) {
  return Number.isFinite(n as number) ? `${Math.round((n as number) * 100)}%` : "—";
}

export default function TargetsAndOdds({ spot, horizonDays, rows }: Props) {
  return (
    <ListCard
      title="Targets & Odds"
      subtitle={<span>Spot <span className="tabular-nums">${spot.toFixed(2)}</span> • Horizon {horizonDays}d</span>}
      maxHeight={340}
    >
      <table className="w-full text-sm">
        <thead className="text-zinc-400 sticky top-0 bg-transparent">
          <tr className="[&>th]:py-2 [&>th]:px-4 text-left">
            <th>Target</th>
            <th className="text-right">Price</th>
            <th className="text-right">Hit (ever)</th>
            <th className="text-right">Hit by end</th>
            <th className="text-right">Med. days-to-hit</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/70">
          {rows.map((r, i) => (
            <tr key={i} className="[&>td]:py-2 [&>td]:px-4">
              <td className="text-zinc-200">{r.label}</td>
              <td className="text-right tabular-nums">${r.price.toFixed(2)}</td>
              <td className="text-right">{pct(r.hitEver)}</td>
              <td className="text-right">{pct(r.hitByEnd)}</td>
              <td className="text-right">{r.tMedDays ?? "—"}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-zinc-400">
                No targets available for this run.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </ListCard>
  );
}
