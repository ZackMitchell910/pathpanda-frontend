// =============================================
// File: src/components/PredictiveAddOns.tsx
// Exports: ScenarioTiles, DriversWaterfall
// Neutral palette; only semantic red/green used for weights
// =============================================
import React from "react";

// ---------- ScenarioTiles ----------
export function ScenarioTiles({ artifact }: { artifact: any }) {
  const items = Array.isArray(artifact?.median_path) ? artifact.median_path : [];
  const spot = items?.[0]?.[1] ?? null;
  const last = items?.at?.(-1)?.[1] ?? null;
  const medPct = spot && last ? ((last / spot - 1) * 100) : null;

  const tiles = [
    { label: "Median path", value: medPct !== null ? `${medPct.toFixed(1)}%` : "—", hint: `D${items.length - 1}` },
    { label: "Horizon", value: `${artifact?.horizon_days ?? "—"}d`, hint: artifact?.symbol ?? "" },
    { label: "Paths", value: `${(artifact as any)?.n_paths ?? "—"}`, hint: "total" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {tiles.map((t, i) => (
        <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-xs text-white/60">{t.label}</div>
          <div className="text-lg font-semibold">{t.value}</div>
          <div className="text-[10px] text-white/50">{t.hint}</div>
        </div>
      ))}
    </div>
  );
}

// ---------- DriversWaterfall ----------
export function DriversWaterfall({ drivers }: { drivers: { feature: string; weight: number }[] }) {
  const items = Array.isArray(drivers) ? drivers : [];
  const maxAbs = Math.max(1e-6, ...items.map((d) => Math.abs(d.weight || 0)));

  return (
    <div className="space-y-2">
      {items.length === 0 && (
        <div className="text-xs text-white/60">No drivers available.</div>
      )}
      {items.map((d, i) => {
        const w = Number(d.weight || 0);
        const pct = Math.min(100, Math.round((Math.abs(w) / maxAbs) * 100));
        const dir = w >= 0 ? 1 : -1;
        return (
          <div key={i} className="p-2 rounded-lg border border-white/10 bg-black/40">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/80">{d.feature}</span>
              <span className="tabular-nums text-white/70">{w.toFixed(4)}</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className={`h-full ${dir > 0 ? "bg-emerald-400" : "bg-rose-400"}`}
                style={{ width: `${pct}%` }}
                title={`${(w).toFixed(4)}`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
