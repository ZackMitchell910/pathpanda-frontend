// ==========================
// File: src/components/TargetsAndOdds.tsx
// Palantir-neutral ladder/table; no amber
// ==========================
import * as React from "react";

export type LadderRow = {
  label: string;           // e.g., "+10%", "Spot"
  price: number;           // absolute price
  hitEver?: number;        // 0..1, optional
  hitByEnd?: number;       // 0..1, optional
  tMedDays?: number;       // median time-to-hit (days), optional
};

export default function TargetsAndOdds({
  spot,
  horizonDays,
  rows,
  highlightPrice,
  highlightDay,
  highlightProbability,
}: {
  spot: number;
  horizonDays: number;
  rows: LadderRow[];
  highlightPrice?: number | null;
  highlightDay?: number | null;
  highlightProbability?: number | null;
}) {
  const data = Array.isArray(rows) ? rows : [];

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 md:col-span-1">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold">Targets & Odds</div>
        <div className="text-xs text-white/60">H{Number.isFinite(horizonDays) ? horizonDays : "-"}d</div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-white/60">
            <tr className="text-left">
              <th className="py-2 pe-3 font-normal">Level</th>
              <th className="py-2 pe-3 font-normal">Price</th>
              <th className="py-2 pe-3 font-normal">Hit (ever)</th>
              <th className="py-2 pe-3 font-normal">Hit by end</th>
              <th className="py-2 font-normal">Median days</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {data.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-white/60">
                  No target rows. Run a simulation to compute odds or supply rows via props.
                </td>
              </tr>
            )}

            {data.map((r) => {
              const isActive =
                typeof highlightPrice === "number" &&
                Math.abs(r.price - highlightPrice) < Math.max(0.01, r.price * 1e-3);
              return (
                <tr
                  key={`${r.label}-${r.price}`}
                  className={`hover:bg-white/5 ${isActive ? "bg-sky-500/15" : ""}`}
                >
                <td className="py-2 pe-3 text-white/90 whitespace-nowrap">{r.label}</td>
                <td className="py-2 pe-3 tabular-nums">${Number(r.price).toFixed(2)}</td>
                <td className="py-2 pe-3 tabular-nums">
                  {fmtPct(r.hitEver)}
                </td>
                <td className="py-2 pe-3 tabular-nums">
                  {fmtPct(r.hitByEnd)}
                </td>
                <td className="py-2 tabular-nums">
                  {Number.isFinite(r.tMedDays as number) ? `D${Math.round(r.tMedDays as number)}` : "-"}
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>

      {/* Spot line */}
      <div className="mt-3 text-[11px] text-white/60">
        Spot: <span className="font-mono text-white/80">${Number(spot).toFixed(2)}</span>
      </div>

      {typeof highlightPrice === "number" && typeof highlightProbability === "number" && (
        <div className="mt-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-[11px] text-sky-100">
          Selected rung: <span className="font-semibold">${highlightPrice.toFixed(2)}</span>
          {typeof highlightDay === "number" ? ` by D${highlightDay}` : ""}
          {" -> "}
          <span className="font-semibold">{fmtPct(highlightProbability)}</span>
        </div>
      )}
    </section>
  );
}

function fmtPct(v?: number) {
  if (!Number.isFinite(v as number)) return "-";
  const x = Math.max(0, Math.min(1, v as number));
  return `${Math.round(x * 100)}%`;
}

