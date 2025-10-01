import React from "react";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  Filler,
  TimeScale,
  ScatterController,
} from "chart.js";
import { Line, Bar, Doughnut, Scatter } from "react-chartjs-2";

ChartJS.register(
  LineElement,
  PointElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  Filler,
  TimeScale,
  ScatterController,
);

/**
 * Types expected from your Monte Carlo artifact
 */
export type Artifact = {
  symbol: string;
  horizon_days: number;
  // median_path: array of [t_index, price]
  median_path: [number, number][];
  // bands: keyed by quantile label, each is array of [t_index, price]
  bands: Record<string, [number, number][]>; // e.g., { p05: [...], p50: [...], p95: [...] }
  // Optional convenience metrics
  prob_up_end?: number; // 0..1
  drivers?: { name: string; weight: number }[]; // +/− contributions (normalized −1..+1 or weights)
};

/**
 * Small helpers
 */
function lastPriceOf(path: [number, number][]): number | null {
  if (!path || path.length === 0) return null;
  return path[path.length - 1][1];
}

function makeTimeLabels(artifact: Artifact): string[] {
  return artifact.median_path.map(([t]) => `D${t}`);
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

/**
 * 1) Terminal outcome distribution (Histogram + CDF)
 */
export const TerminalDistribution: React.FC<{
  pathsTerminal: number[]; // array of terminal prices (one per path)
  ptiles?: { p05?: number; p50?: number; p95?: number };
}> = ({ pathsTerminal, ptiles }) => {
  // Build histogram bins
  const nBins = Math.min(40, Math.max(10, Math.floor(Math.sqrt(pathsTerminal.length))));
  const minV = Math.min(...pathsTerminal);
  const maxV = Math.max(...pathsTerminal);
  const binWidth = (maxV - minV) / nBins || 1;
  const bins = new Array(nBins).fill(0);
  for (const v of pathsTerminal) {
    const idx = Math.min(nBins - 1, Math.max(0, Math.floor((v - minV) / binWidth)));
    bins[idx]++;
  }
  const labels = bins.map((_, i) => (minV + i * binWidth).toFixed(2));
  const pdf = bins.map((b) => b / pathsTerminal.length);
  // CDF from histogram
  const cdf: number[] = [];
  let acc = 0;
  for (const p of pdf) {
    acc += p;
    cdf.push(acc);
  }

  const dataBar = {
    labels,
    datasets: [
      {
        type: "bar" as const,
        label: "PDF (terminal)",
        data: pdf,
        borderWidth: 0,
      },
      {
        type: "line" as const,
        label: "CDF (terminal)",
        data: cdf,
        borderWidth: 2,
        tension: 0.2,
        yAxisID: "y1",
      },
    ],
  };

  const options: any = {
    responsive: true,
    interaction: { mode: "index", intersect: false },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: "PDF" } },
      y1: { beginAtZero: true, position: "right", max: 1, title: { display: true, text: "CDF" } },
      x: { ticks: { maxRotation: 0 } },
    },
    plugins: {
      legend: { display: true },
      tooltip: { enabled: true },
    },
  };

  // Vertical markers for percentiles
  const markers = (
    <div className="text-xs mt-2 grid grid-cols-3 gap-2">
      {ptiles?.p05 != null && <div>p05: {ptiles.p05.toFixed(2)}</div>}
      {ptiles?.p50 != null && <div>p50: {ptiles.p50.toFixed(2)}</div>}
      {ptiles?.p95 != null && <div>p95: {ptiles.p95.toFixed(2)}</div>}
    </div>
  );

  return (
    <div className="p-4 rounded-2xl shadow-lg bg-gray-900 text-gray-100">
      <h3 className="text-lg font-semibold mb-2">Terminal Distribution (PDF + CDF)</h3>
      <Bar data={dataBar as any} options={options} />
      {markers}
    </div>
  );
};

/**
 * 2) Hit probability ribbon: Pr(S_t > thresholds)
 */
export const HitProbabilityRibbon: React.FC<{
  artifact: Artifact;
  thresholds: number[]; // absolute price targets or multipliers applied to S0 passed in via thresholdsAbs
  thresholdsAbs?: boolean; // if false (default), treat thresholds as % moves from S0
  S0: number; // current spot used for % thresholds
  pathMatrixAbove: (tIndex: number, thresholdAbs: number) => number; // returns probability (0..1)
}> = ({ artifact, thresholds, thresholdsAbs = false, S0, pathMatrixAbove }) => {
  const labels = makeTimeLabels(artifact);
  const thAbs = thresholdsAbs ? thresholds : thresholds.map((r) => S0 * (1 + r));
  const datasets = thAbs.map((thr, i) => ({
    label: thresholdsAbs ? `Pr(S_t ≥ ${thr.toFixed(2)})` : `Pr(S_t ≥ ${(100 * thresholds[i]).toFixed(0)}%)`,
    data: labels.map((_, t) => clamp01(pathMatrixAbove(t, thr))),
    borderWidth: 2,
    tension: 0.25,
    fill: false,
  }));

  const data = { labels, datasets } as any;
  const options = {
    responsive: true,
    scales: {
      y: { min: 0, max: 1, ticks: { callback: (v: number) => `${Math.round(100 * v)}%` } },
    },
    plugins: { legend: { display: true } },
  } as any;

  return (
    <div className="p-4 rounded-2xl shadow-lg bg-gray-900 text-gray-100">
      <h3 className="text-lg font-semibold mb-2">Hit Probabilities by Day</h3>
      <Line data={data} options={options} />
    </div>
  );
};

/**
 * 3) Target ladder bars at horizon
 */
export const TargetLadder: React.FC<{
  probs: { label: string; p: number }[]; // e.g., [{label: "+5%", p: 0.61}, ...]
}> = ({ probs }) => {
  const data = {
    labels: probs.map((x) => x.label),
    datasets: [
      {
        label: "Pr at Horizon",
        data: probs.map((x) => clamp01(x.p)),
        borderWidth: 1,
      },
    ],
  } as any;
  const options = {
    indexAxis: "y" as const,
    responsive: true,
    scales: { x: { min: 0, max: 1, ticks: { callback: (v: number) => `${Math.round(100 * v)}%` } } },
    plugins: { legend: { display: false } },
  } as any;
  return (
    <div className="p-4 rounded-2xl shadow-lg bg-gray-900 text-gray-100">
      <h3 className="text-lg font-semibold mb-2">Target Ladder (Horizon Odds)</h3>
      <Bar data={data} options={options} />
    </div>
  );
};

/**
 * 4) Scenario tiles: p05 / p50 / p95 representative paths
 */
export const ScenarioTiles: React.FC<{
  artifact: Artifact;
  reps: { label: string; path: [number, number][] }[]; // paths for bear/base/bull
}> = ({ artifact, reps }) => {
  const labels = makeTimeLabels(artifact);
  const commonOpts: any = {
    responsive: true,
    scales: { y: { beginAtZero: false } },
    plugins: { legend: { display: false } },
    elements: { point: { radius: 0 } },
  };
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {reps.map((r) => (
        <div key={r.label} className="p-4 rounded-2xl shadow-lg bg-gray-900 text-gray-100">
          <div className="text-sm font-semibold mb-2">{r.label}</div>
          <Line
            data={{ labels, datasets: [{ data: r.path.map(([, y]) => y), borderWidth: 2 }] } as any}
            options={commonOpts}
          />
        </div>
      ))}
    </div>
  );
};

/**
 * 5) Risk dials: VaR & ES (Doughnut mini‑gauges)
 */
export const RiskDials: React.FC<{
  var95: number; // negative number indicates loss
  es95: number; // negative average of tail
}> = ({ var95, es95 }) => {
  const mkDial = (value: number, label: string) => {
    const pct = Math.min(1, Math.abs(value)); // if you pass % loss (0..1). For absolute, adapt formatter below.
    const data = {
      labels: [label, "rest"],
      datasets: [
        {
          data: [pct, 1 - pct],
        },
      ],
    } as any;
    return (
      <div className="flex flex-col items-center">
        <Doughnut data={data} options={{ cutout: "70%", plugins: { legend: { display: false } } }} />
        <div className="-mt-10 text-sm font-semibold">{label}: {value.toFixed(2)}</div>
      </div>
    );
  };
  return (
    <div className="p-4 rounded-2xl shadow-lg bg-gray-900 text-gray-100 flex gap-6 justify-around">
      {mkDial(var95, "VaR 95%")}
      {mkDial(es95, "ES 95%")}
    </div>
  );
};

/**
 * 6) Drivers attribution (waterfall-ish bar)
 */
export const DriversWaterfall: React.FC<{
  drivers: { name: string; weight: number }[]; // positive/negative contributions
}> = ({ drivers }) => {
  const data = {
    labels: drivers.map((d) => d.name),
    datasets: [
      {
        label: "Contribution",
        data: drivers.map((d) => d.weight),
        borderWidth: 1,
      },
    ],
  } as any;
  const options = {
    responsive: true,
    scales: {
      y: { grid: { drawBorder: false } },
      x: { grid: { display: false } },
    },
    plugins: { legend: { display: false } },
  } as any;
  return (
    <div className="p-4 rounded-2xl shadow-lg bg-gray-900 text-gray-100">
      <h3 className="text-lg font-semibold mb-2">Key Drivers</h3>
      <Bar data={data} options={options} />
    </div>
  );
};

/**
 * 7) Calibration & coverage panel (PIT + coverage)
 */
export const CalibrationPanel: React.FC<{
  pitBins: number[]; // 10 or 20 bins of PIT histogram (should be ~flat)
  coverage: { label: string; intended: number; empirical: number }[];
}> = ({ pitBins, coverage }) => {
  const pitData = {
    labels: pitBins.map((_, i) => `${i / pitBins.length}-${(i + 1) / pitBins.length}`),
    datasets: [{ label: "PIT", data: pitBins, borderWidth: 1 }],
  } as any;
  const covData = {
    labels: coverage.map((c) => c.label),
    datasets: [
      { label: "Intended", data: coverage.map((c) => c.intended) },
      { label: "Empirical", data: coverage.map((c) => c.empirical) },
    ],
  } as any;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="p-4 rounded-2xl shadow-lg bg-gray-900 text-gray-100">
        <h3 className="text-lg font-semibold mb-2">PIT Histogram</h3>
        <Bar data={pitData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
      </div>
      <div className="p-4 rounded-2xl shadow-lg bg-gray-900 text-gray-100">
        <h3 className="text-lg font-semibold mb-2">Coverage (Intended vs Empirical)</h3>
        <Bar data={covData} options={{ responsive: true }} />
      </div>
    </div>
  );
};

/**
 * 8) Options & 9) Futures – lightweight cards (you can wire to your API)
 */
export const OptionsMiniBoard: React.FC<{
  ivAvg: number; skew?: number; topOI?: { contract: string; oi: number; iv?: number }[];
}> = ({ ivAvg, skew, topOI }) => (
  <div className="p-4 rounded-2xl shadow-lg bg-gray-900 text-gray-100">
    <h3 className="text-lg font-semibold mb-2">Options Snapshot</h3>
    <div className="text-sm">Avg IV: {(ivAvg * 100).toFixed(1)}%</div>
    {skew != null && <div className="text-sm">Skew: {(skew * 100).toFixed(1)}%</div>}
    <div className="mt-3 space-y-1">
      {topOI?.slice(0, 5).map((x) => (
        <div key={x.contract} className="flex justify-between text-xs border-b border-gray-800 py-1">
          <span>{x.contract}</span>
          <span>OI {x.oi.toLocaleString()} {x.iv != null ? `· IV ${(x.iv * 100).toFixed(0)}%` : ""}</span>
        </div>
      ))}
    </div>
  </div>
);

export const FuturesCurve: React.FC<{
  series: { label: string; price: number }[]; spot?: number;
}> = ({ series, spot }) => {
  const data = {
    labels: series.map((s) => s.label),
    datasets: [
      { label: "Futures", data: series.map((s) => s.price), borderWidth: 2, fill: false },
      spot != null ? { label: "Spot", data: series.map(() => spot), borderWidth: 1, borderDash: [6, 4] } as any : undefined,
    ].filter(Boolean),
  } as any;
  const options = { responsive: true, plugins: { legend: { display: true } } } as any;
  return (
    <div className="p-4 rounded-2xl shadow-lg bg-gray-900 text-gray-100">
      <h3 className="text-lg font-semibold mb-2">Futures Curve vs Spot</h3>
      <Line data={data} options={options} />
    </div>
  );
};

/**
 * 10) Sentiment micro‑sparkline
 */
export const SentimentStrip: React.FC<{
  values: number[]; // normalized −1..+1 or 0..1
  labels?: string[];
}> = ({ values, labels }) => {
  const data = {
    labels: labels ?? values.map((_, i) => `${i}`),
    datasets: [{ data: values, borderWidth: 2, tension: 0.25, fill: true }],
  } as any;
  const options = {
    responsive: true,
    elements: { point: { radius: 0 } },
    plugins: { legend: { display: false } },
    scales: { y: { display: false }, x: { display: false } },
  } as any;
  return (
    <div className="p-3 rounded-xl bg-gray-900 text-gray-100">
      <Line data={data} options={options} />
    </div>
  );
};

/**
 * 11) Regime map (μ vs σ) – scatter
 */
export const RegimeMap: React.FC<{
  points: { mu: number; sigma: number; label?: string }[]; // historical windows
  currentIx?: number; // index to highlight
}> = ({ points, currentIx }) => {
  const data = {
    datasets: [
      {
        label: "History",
        data: points.map((p) => ({ x: p.sigma, y: p.mu })),
        showLine: false,
      },
      currentIx != null
        ? {
            label: "Current",
            data: [{ x: points[currentIx].sigma, y: points[currentIx].mu }],
            pointStyle: "rectRot" as const,
            pointRadius: 6,
          }
        : undefined,
    ].filter(Boolean),
  } as any;
  const options = {
    responsive: true,
    scales: {
      x: { title: { display: true, text: "σ (vol)" } },
      y: { title: { display: true, text: "μ (drift)" } },
    },
  } as any;
  return (
    <div className="p-4 rounded-2xl shadow-lg bg-gray-900 text-gray-100">
      <h3 className="text-lg font-semibold mb-2">Regime Map (μ vs σ)</h3>
      <Scatter data={data} options={options} />
    </div>
  );
};

/**
 * 12) Cone vs realized gallery – single overlay example
 */
export const ConeVsRealized: React.FC<{
  labels: string[]; // D0..Dk
  p05: number[];
  p50: number[];
  p95: number[];
  realized: number[]; // same length as labels
}> = ({ labels, p05, p50, p95, realized }) => {
  const data = {
    labels,
    datasets: [
      { label: "p05", data: p05, borderWidth: 1, fill: false },
      { label: "p50", data: p50, borderWidth: 2, fill: false },
      { label: "p95", data: p95, borderWidth: 1, fill: "-1" },
      { label: "Realized", data: realized, borderWidth: 2, borderDash: [6, 3], fill: false },
    ],
  } as any;
  const options = {
    responsive: true,
    plugins: { legend: { display: true } },
    elements: { point: { radius: 0 } },
  } as any;
  return (
    <div className="p-4 rounded-2xl shadow-lg bg-gray-900 text-gray-100">
      <h3 className="text-lg font-semibold mb-2">Cone vs Realized</h3>
      <Line data={data} options={options} />
    </div>
  );
};

/**
 * Example Layout – drop‑in grid for your dashboard
 * Pass real data from your SSE artifact + snapshots.
 */
export const PredictiveAddOnsDemo: React.FC<{
  artifact: Artifact;
  S0: number;
  pathsTerminal: number[];
  percentileAtH: { p05: number; p50: number; p95: number };
  pathMatrixAbove: (tIndex: number, thresholdAbs: number) => number;
  targetLadder: { label: string; p: number }[];
  scenarioReps: { label: string; path: [number, number][] }[];
  var95: number; es95: number;
  drivers: { name: string; weight: number }[];
  pitBins: number[];
  coverage: { label: string; intended: number; empirical: number }[];
  options: { ivAvg: number; skew?: number; topOI?: { contract: string; oi: number; iv?: number }[] };
  futures: { series: { label: string; price: number }[]; spot?: number };
  sentiment: number[];
  regime: { points: { mu: number; sigma: number; label?: string }[]; currentIx?: number };
  realizedOverlay?: { labels: string[]; p05: number[]; p50: number[]; p95: number[]; realized: number[] };
}> = (props) => {
  const {
    artifact,
    S0,
    pathsTerminal,
    percentileAtH,
    pathMatrixAbove,
    targetLadder,
    scenarioReps,
    var95,
    es95,
    drivers,
    pitBins,
    coverage,
    options,
    futures,
    sentiment,
    regime,
    realizedOverlay,
  } = props;

  return (
    <div className="w-full grid grid-cols-1 gap-4">
      {/* Decision Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <RiskDials var95={var95} es95={es95} />
        <TargetLadder probs={targetLadder} />
        <HitProbabilityRibbon artifact={artifact} thresholds={[-0.05, 0, 0.05, 0.1]} S0={S0} pathMatrixAbove={pathMatrixAbove} />
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          {/* You likely already render your fan chart elsewhere */}
          <ScenarioTiles artifact={artifact} reps={scenarioReps} />
        </div>
        <DriversWaterfall drivers={drivers} />
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TerminalDistribution pathsTerminal={pathsTerminal} ptiles={percentileAtH} />
        <OptionsMiniBoard ivAvg={options.ivAvg} skew={options.skew} topOI={options.topOI} />
        <FuturesCurve series={futures.series} spot={futures.spot} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SentimentStrip values={sentiment} />
        <RegimeMap points={regime.points} currentIx={regime.currentIx} />
        <CalibrationPanel pitBins={pitBins} coverage={coverage} />
      </div>

      {realizedOverlay && (
        <ConeVsRealized
          labels={realizedOverlay.labels}
          p05={realizedOverlay.p05}
          p50={realizedOverlay.p50}
          p95={realizedOverlay.p95}
          realized={realizedOverlay.realized}
        />
      )}
    </div>
  );
};
