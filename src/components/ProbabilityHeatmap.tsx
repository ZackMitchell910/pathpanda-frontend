// =============================================
// File: src/components/ProbabilityHeatmap.tsx
// Touch probability heatmap (thresholds × days)
// =============================================
import React, { useMemo } from "react";

type Selection = { thresholdIndex: number; dayIndex: number } | null;

export interface ProbabilityHeatmapProps {
  thresholds: number[];
  probsByDay: number[][];
  days?: number[];
  spot?: number | null;
  selected?: Selection;
  onSelect?: (args: {
    thresholdIndex: number;
    dayIndex: number;
    probability: number;
    threshold: number;
    day: number;
  }) => void;
}

export function ProbabilityHeatmap({
  thresholds,
  probsByDay,
  days,
  spot,
  selected,
  onSelect,
}: ProbabilityHeatmapProps) {
  const matrix = useMemo(() => {
    const validThresholds = Array.isArray(thresholds) ? thresholds : [];
    const validProbs = Array.isArray(probsByDay) ? probsByDay : [];
    const rowCount = validThresholds.length;
    const colCount = Math.max(0, ...validProbs.map((row) => (Array.isArray(row) ? row.length : 0)));
    const dayLabels =
      Array.isArray(days) && days.length === colCount
        ? days
        : Array.from({ length: colCount }, (_, idx) => idx);
    const rows = Array.from({ length: rowCount }, (_, rIdx) => {
      const threshold = Number(validThresholds[rIdx]);
      const probs = Array.isArray(validProbs[rIdx]) ? validProbs[rIdx] : [];
      return {
        threshold,
        probs: dayLabels.map((day, cIdx) => {
          const value = Number(probs[cIdx]);
          return Number.isFinite(value) && value >= 0 ? value : 0;
        }),
      };
    });
    return { rows, dayLabels };
  }, [thresholds, probsByDay, days]);

  const thresholdLabels = useMemo(() => {
    if (!spot || !Number.isFinite(spot)) {
      return thresholds.map((thr) => `$${formatNumber(thr)}`);
    }
    return thresholds.map((thr) => {
      if (!Number.isFinite(thr)) return "-";
      const pct = ((thr / spot) - 1) * 100;
      const prefix = pct >= 0 ? "+" : "";
      return `${prefix}${pct.toFixed(0)}%`;
    });
  }, [thresholds, spot]);

  if (!matrix.rows.length || !matrix.dayLabels.length) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-white/60">
        No probability ladder available.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-[2px] text-[11px]">
        <thead>
          <tr className="text-white/60">
            <th className="sticky left-0 z-[1] rounded-md bg-black/60 px-2 py-1 text-left font-normal">Threshold</th>
            {matrix.dayLabels.map((day) => (
              <th key={day} className="rounded-md bg-black/40 px-2 py-1 font-normal">
                D{day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.rows.map((row, rIdx) => (
            <tr key={`thr-${row.threshold}-${rIdx}`}>
              <td className="sticky left-0 z-[1] whitespace-nowrap rounded-md bg-black/70 px-2 py-1 text-white/80">
                {thresholdLabels[rIdx] ?? "-"}
              </td>
              {row.probs.map((prob, cIdx) => {
                const isSelected = selected?.thresholdIndex === rIdx && selected?.dayIndex === cIdx;
                return (
                  <td
                    key={`cell-${rIdx}-${cIdx}`}
                    className={`rounded-md px-2 py-1 text-center font-medium ${
                      isSelected ? "ring-2 ring-sky-300 ring-offset-0" : ""
                    }`}
                    style={{ background: colorForProbability(prob, isSelected), color: textColorForProbability(prob) }}
                    onClick={() =>
                      onSelect?.({
                        thresholdIndex: rIdx,
                        dayIndex: cIdx,
                        probability: prob,
                        threshold: row.threshold,
                        day: matrix.dayLabels[cIdx],
                      })
                    }
                  >
                    {formatPercent(prob)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function colorForProbability(prob: number, selected?: boolean) {
  const clamped = Math.max(0, Math.min(1, Number(prob) || 0));
  const intensity = 0.18 + clamped * 0.65;
  if (selected) {
    return `rgba(56,189,248,${Math.min(0.95, intensity + 0.1)})`;
  }
  return `rgba(56,189,248,${intensity})`;
}

function textColorForProbability(prob: number) {
  return prob > 0.6 ? "#0f172a" : "rgba(248,250,252,0.92)";
}

function formatPercent(prob: number) {
  if (!Number.isFinite(prob)) return "-";
  const pct = Math.round(prob * 100);
  return `${pct}%`;
}

function formatNumber(value: number) {
  return Number(value).toFixed(2);
}
