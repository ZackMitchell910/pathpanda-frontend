// =============================================
// File: src/components/PredictiveAddOns.tsx
// Exports: ScenarioTiles, DriversWaterfall
// Neutral palette; only semantic red/green used for weights
// =============================================
import React, { useMemo } from "react";

type ScenarioView = {
  id: string;
  label: string;
  weight: number | null;
  description?: string | null;
  narrative?: string | null;
  drivers?: { feature: string; weight: number }[] | null;
  color?: string | null;
};

type ScenarioTilesProps = {
  scenarios: ScenarioView[];
  activeMap: Record<string, boolean>;
  selectedId: string | null;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onReset?: () => void;
};

// ---------- ScenarioTiles ----------
export function ScenarioTiles({ scenarios, activeMap, selectedId, onToggle, onSelect, onReset }: ScenarioTilesProps) {
  const { totalWeight, activeWeight, activeCount } = useMemo(() => {
    const total = scenarios.reduce((acc, scenario) => acc + (scenario.weight ?? 0), 0);
    const active = scenarios.reduce(
      (acc, scenario) =>
        (activeMap[scenario.id] ?? true) ? acc + (scenario.weight ?? 0) : acc,
      0
    );
    const activeScenarioCount = scenarios.reduce(
      (acc, scenario) => acc + ((activeMap[scenario.id] ?? true) ? 1 : 0),
      0
    );
    return { totalWeight: total, activeWeight: active, activeCount: activeScenarioCount };
  }, [scenarios, activeMap]);

  if (!scenarios.length) {
    return <div className="text-xs text-white/60">No scenarios available.</div>;
  }

  const coverage =
    totalWeight > 0
      ? Math.max(0, Math.min(1, activeWeight / totalWeight))
      : activeCount / scenarios.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-white/60">
        <span>
          Active coverage:
          <span className="ms-1 font-semibold text-white/80">{formatPercent(coverage)}</span>
        </span>
        {onReset && (
          <button
            type="button"
            className="rounded-md border border-white/15 px-2 py-1 text-[11px] text-white/70 transition hover:bg-white/10"
            onClick={onReset}
          >
            Reset toggles
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {scenarios.map((scenario) => {
          const isActive = activeMap[scenario.id] ?? true;
          const isSelected = selectedId === scenario.id;
          const weightPct =
            scenario.weight !== null ? Math.max(0, Math.min(100, scenario.weight * 100)) : null;
          const previewDrivers = Array.isArray(scenario.drivers) ? scenario.drivers.slice(0, 3) : [];

          return (
            <div
              key={scenario.id}
              className={`rounded-xl border px-3 py-3 transition ${
                isSelected ? "border-sky-400 bg-sky-400/10" : "border-white/10 bg-white/5 hover:border-white/20"
              } ${!isActive ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  className="text-left"
                  onClick={() => onSelect(scenario.id)}
                >
                  <div className="flex items-center gap-2">
                    {scenario.color && (
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: scenario.color }}
                      />
                    )}
                    <span className="text-sm font-semibold text-white/90">{scenario.label}</span>
                  </div>
                  {scenario.description && (
                    <p className="mt-1 text-[11px] text-white/60 line-clamp-2">{scenario.description}</p>
                  )}
                  {!scenario.description && scenario.narrative && (
                    <p className="mt-1 text-[11px] text-white/60 line-clamp-2">{scenario.narrative}</p>
                  )}
                </button>

                <button
                  type="button"
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold transition ${
                    isActive
                      ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-100"
                      : "border-white/15 bg-black/40 text-white/60"
                  }`}
                  onClick={() => onToggle(scenario.id)}
                >
                  {isActive ? "Active" : "Off"}
                </button>
              </div>

              {weightPct !== null && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11px] text-white/60">
                    <span>Weight</span>
                    <span className="font-mono text-white/80">{weightPct.toFixed(1)}%</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${weightPct}%`,
                        backgroundColor: scenario.color ?? "rgba(56,189,248,0.8)",
                      }}
                    />
                  </div>
                </div>
              )}

              {previewDrivers.length > 0 && (
                <div className="mt-3 space-y-1 text-[11px] text-white/70">
                  {previewDrivers.map((driver, idx) => (
                    <div key={`${scenario.id}-drv-${idx}`} className="flex justify-between gap-2 font-mono">
                      <span className="truncate text-white/60">{driver.feature}</span>
                      <span>{driver.weight.toFixed(4)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
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
                title={`${w.toFixed(4)}`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatPercent(v: number) {
  return `${Math.round(v * 100)}%`;
}
