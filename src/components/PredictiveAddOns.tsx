// src/components/PredictiveAddOns.tsx
import React from "react";
import "chart.js/auto";
import type { ChartData, ChartOptions, ActiveElement } from "chart.js";
import { Line, Bar, Chart as MixedChart } from "react-chartjs-2";
import { Card } from "./ui/Card";
import { PP_COLORS } from "../theme/chartTheme";
import { Chart as ChartComponent } from "react-chartjs-2";
export interface Artifact {
  symbol: string;
  horizon_days: number;
  median_path: [number, number][];
  bands: Record<string, [number, number][]>;
  prob_up_end?: number;
  drivers?: { name: string; weight: number }[];
}

const makeTimeLabels = (artifact: Artifact): string[] =>
  artifact.median_path.map(([t]) => `D${t}`);

/* ----------------------- TerminalDistribution ---------------------- */

type Ptiles = { p05?: number | null; p50?: number | null; p95?: number | null };

export const TerminalDistribution: React.FC<{
  pathsTerminal: number[];
  ptiles?: Ptiles;
}> = ({ pathsTerminal, ptiles }) => {
  if (!pathsTerminal?.length) {
    return <div className="text-xs text-zinc-400">No terminal data.</div>;
  }

  // Histogram (PDF) + CDF
  const values = [...pathsTerminal].sort((a, b) => a - b);
  const n = values.length;
  const vMin = values[0];
  const vMax = values[n - 1];

  const nBins = Math.min(60, Math.max(20, Math.floor(Math.sqrt(n))));
  const binWidth = (vMax - vMin) / nBins || 1;

  const counts = new Array(nBins).fill(0);
  for (const v of values) {
    let idx = Math.floor((v - vMin) / binWidth);
    if (idx >= nBins) idx = nBins - 1;
    if (idx < 0) idx = 0;
    counts[idx] += 1;
  }

  const pdf = counts.map((c) => c / (n * binWidth));
  const cdf: number[] = [];
  let running = 0;
  for (let i = 0; i < nBins; i++) {
    running += counts[i];
    cdf.push(running / n);
  }
  // --- shared hover presets ---
  const HOVER_POINTS = {
    pointRadius: 0,          // hide points until hovered
    pointHoverRadius: 5,     // visible pin-dot size
    pointHitRadius: 10,      // easier to hover
    pointHoverBorderWidth: 2,
  };

  const SHARED_HOVER_OPTIONS = {
    interaction: { mode: "index" as const, intersect: false },
    plugins: {
      tooltip: {
        mode: "index" as const,
        intersect: false,
        callbacks: {
          // unified label formatting (price if it looks like a price axis)
          label: (ctx: any) => {
            const label = ctx.dataset?.label ?? "";
            const y = ctx.parsed?.y;
            if (y == null) return label;
            // if the y-range looks like a dollar axis, format as price
            const asPrice =
              ctx.chart?.scales?.y?.options?.title?.text?.toLowerCase?.().includes("price");
            const formatted = asPrice
              ? `$${Number(y).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
              : `${Number(y).toLocaleString(undefined, { maximumFractionDigits: 4 })}`;
            return `${label}: ${formatted}`;
          },
        },
      },
      legend: { display: true },
    },
    elements: { point: { radius: 0 } }, // default: no points unless hovered
  };


  const labels = Array.from({ length: nBins }, (_, i) =>
    (vMin + (i + 0.5) * binWidth).toFixed(2)
  );

  const data: ChartData<"bar" | "line", number[], string> = {
    labels,
    datasets: [
      {
        type: "bar",
        label: "PDF",
        data: pdf,
        yAxisID: "y",
        borderWidth: 0,
        backgroundColor: "rgba(99,102,241,0.45)",
        barPercentage: 1.0,
        categoryPercentage: 1.0,
      },
      {
        type: "line",
        label: "CDF",
        data: cdf,
        yAxisID: "y1",
        borderColor: "#0EA5E9",
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.15,
      },
    ],
  };

  const options: ChartOptions<"bar" | "line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: { legend: { display: true }, tooltip: { enabled: true } },
    scales: {
      x: {
        ticks: { maxRotation: 0, autoSkip: true },
        title: { display: true, text: "Price" },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        title: { display: true, text: "PDF" },
        grid: { color: "rgba(148,163,184,0.15)" },
      },
      y1: {
        beginAtZero: true,
        max: 1,
        position: "right",
        title: { display: true, text: "CDF" },
        grid: { display: false },
      },
    },
  };

  return (
    <div className="relative w-full" style={{ height: 280 }}>
      <ChartComponent type="bar" data={data} options={options} />
      <div className="text-[11px] mt-2 grid grid-cols-3 gap-2 opacity-80">
        {ptiles?.p05 != null && <div>p05: {ptiles.p05.toFixed(2)}</div>}
        {ptiles?.p50 != null && <div>p50: {ptiles.p50.toFixed(2)}</div>}
        {ptiles?.p95 != null && <div>p95: {ptiles.p95.toFixed(2)}</div>}
      </div>
    </div>
  );
};
/* -------------------------- DriversWaterfall ------------------------ */
export const DriversWaterfall: React.FC<{
  drivers?: { name: string; weight: number }[];
}> = ({ drivers }) => {
  const rows = Array.isArray(drivers) ? drivers : [];
  if (!rows.length) return <div className="text-xs opacity-70">No drivers yet.</div>;

  const labels = rows.map((d) => String(d?.name ?? ""));
  const dataVals = rows.map((d) => (Number.isFinite(d?.weight) ? Number(d.weight) : 0));

  const [explanation, setExplanation] = React.useState<string | null>(null);
  const fetchExplanation = async (driver: string) =>
    `Explanation for ${driver}: Influences price due to market trends.`;
  const handleClick = async (name: string) => setExplanation(await fetchExplanation(name));

  const chartData: ChartData<"bar"> = {
    labels,
    datasets: [
      {
        label: "Driver Impact",
        data: dataVals,
        backgroundColor: dataVals.map((w) => (w >= 0 ? PP_COLORS.bull : PP_COLORS.bear)),
        borderWidth: 0,
      },
    ],
  };

  const options: ChartOptions<"bar"> = {
    responsive: true,
    indexAxis: "y",
    plugins: { legend: { display: false }, tooltip: { enabled: true } },
    scales: {
      x: { title: { display: true, text: "Impact" } },
      y: { title: { display: true, text: "Drivers" } },
    },
    onClick: (_e, elements) => {
      const el = (elements?.[0] as ActiveElement | undefined) || undefined;
      if (el?.index != null) handleClick(labels[el.index]);
    },
  };

  return (
    <div data-chart="drivers">
      <Bar data={chartData} options={options} />
      {explanation && <div className="text-sm mt-2">{explanation}</div>}
    </div>
  );
};

/* ----------------------------- ScenarioTiles ----------------------------- */
export const ScenarioTiles: React.FC<{
  artifact?: Artifact;
  reps?: { label: string; path: [number, number][] }[];
}> = ({ artifact, reps }) => {
  const labels =
    Array.isArray(artifact?.median_path) && artifact!.median_path.length
      ? artifact!.median_path.map(([t]) => `D${t}`)
      : [];

  const datasets: ChartData<"line">["datasets"] = [];

  if (labels.length && Array.isArray(artifact?.median_path)) {
    datasets.push({
      label: "Median",
      data: artifact!.median_path.map(([, y]) => y),
      borderColor: PP_COLORS.median,
      borderWidth: 2,
      pointRadius: 0,
    });
  }

  if (Array.isArray(reps) && reps.length) {
    datasets.push(
      ...reps.map((r) => ({
        label: r.label,
        data: (Array.isArray(r.path) ? r.path : []).map(([, y]) => y),
        borderColor: r.label.toLowerCase().includes("bull") ? PP_COLORS.bull : PP_COLORS.bear,
        borderWidth: 2,
        pointRadius: 0,
      }))
    );
  }

  if (!labels.length || !datasets.length) {
    return <div className="text-xs opacity-70">No scenarios computed.</div>;
  }

  const data: ChartData<"line"> = { labels, datasets };
  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true }, tooltip: { enabled: true } },
  };

  return (
    <div data-chart="scenarios">
      <Line data={data} options={options} />
    </div>
  );
};


/* ----------------------------- TargetLadder ------------------------------ */
// Keep in src/components/PredictiveAddOns.tsx (or its own file) – full replacement
export function TargetLadder({
  probs,
}: {
  probs: Array<{ target?: string; prob?: number; label?: string; p?: number }>;
}) {
  const items = (probs || [])
    .map((row) => ({
      target: (row.target ?? row.label ?? "").toString(),
      prob: Number.isFinite(row.prob ?? row.p) ? Number(row.prob ?? row.p) : NaN,
    }))
    .filter((r) => r.target && Number.isFinite(r.prob));

  return (
    <div className="rounded-lg border border-[#273141] bg-[#0E141C] p-3">
      <div className="text-sm font-semibold mb-2">Target Probabilities</div>
      <ul className="space-y-1">
        {items.map((p, i) => (
          <li key={i} className="flex items-center justify-between text-sm">
            <span className="text-zinc-300">{p.target}</span>
            <span className="font-mono">{(p.prob * 100).toFixed(1)}%</span>
          </li>
        ))}
        {items.length === 0 && (
          <li className="text-xs text-zinc-400">No target probabilities.</li>
        )}
      </ul>
    </div>
  );
}




/* ------------------------- HitProbabilityRibbon ------------------------- */
type Bands =
  | {
      p50: [number, number][];
      p80_low: [number, number][];
      p80_high: [number, number][];
      p95_low: [number, number][];
      p95_high: [number, number][];
    }
  | undefined;

export function HitProbabilityRibbon({
  artifact,
  thresholds = [-0.05, 0, 0.05, 0.1],
  S0,
  pathMatrixAbove,
}: {
  artifact?: {
    symbol?: string;
    horizon_days?: number;
    median_path?: [number, number][];
    hit_probs?: { thresholds_abs?: number[]; probs_by_day?: number[][] };
  };
  thresholds?: number[];
  S0?: number;
  pathMatrixAbove?: (tIndex: number, thresholdAbs: number) => number;
}) {
  const probsFromBackend = artifact?.hit_probs?.probs_by_day;
  const thresholdsAbsFromBackend = artifact?.hit_probs?.thresholds_abs;

  const T =
    probsFromBackend?.[0]?.length ??
    (Number.isFinite(artifact?.horizon_days) ? (artifact!.horizon_days as number) + 1 : 0);

  if (!T) {
    return <div className="text-xs opacity-70">Run a simulation to see hit probabilities.</div>;
  }

  const labels = Array.from({ length: T }, (_, i) => `D${i}`);
  const s0 =
    typeof S0 === "number"
      ? S0
      : Array.isArray(artifact?.median_path) && artifact!.median_path.length
      ? artifact!.median_path[0][1]
      : undefined;

  const thresholdsPct: number[] =
    thresholdsAbsFromBackend && thresholdsAbsFromBackend.length && typeof s0 === "number"
      ? thresholdsAbsFromBackend.map((abs) => abs / s0 - 1)
      : thresholds;

  const safePathMatrixAbove = pathMatrixAbove ?? ((_t: number, _thrAbs: number) => 0);

  const probsByDay: number[][] =
    probsFromBackend && probsFromBackend.length
      ? probsFromBackend
      : typeof s0 === "number"
      ? thresholdsPct.map((th) =>
          Array.from({ length: T }, (_, t) => safePathMatrixAbove(t, (1 + th) * s0))
        )
      : thresholdsPct.map(() => Array.from({ length: T }, () => 0));

  const palette = ["#34D399", "#22D3EE", "#60A5FA", "#FBBF24"];
  const datasets = probsByDay.map((series, i) => ({
    label: `Above ${Math.round(thresholdsPct[i] * 100)}%`,
    data: series,
    borderColor: palette[i % palette.length],
    borderWidth: 2,
    pointRadius: 0,
    tension: 0.15,
  }));

  const data: ChartData<"line"> = { labels, datasets };
  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { grid: { display: false }, ticks: { maxRotation: 0 }, title: { display: true, text: "Days" } },
      y: { min: 0, max: 1, title: { display: true, text: "Probability" } },
    },
    plugins: { legend: { display: true }, tooltip: { enabled: true } },
    elements: { line: { fill: false } },
  };

  return (
    <div className="relative w-full" style={{ height: 320 }}>
      <Line data={data} options={options} />
    </div>
  );
}

export default HitProbabilityRibbon;
