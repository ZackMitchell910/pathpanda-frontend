// =============================================
// File: src/components/TerminalDistribution.tsx
// Mode-aware terminal distribution with KDE + HPD overlays
// =============================================
import React, { useEffect, useMemo, useRef, useState } from "react";
import Chart from "chart.js/auto";
import type { Chart as ChartJS, ChartDataset, ChartOptions, Plugin } from "chart.js";
import type { TerminalDensitySummary, TerminalSampleMeta } from "@/types/simulation";

type HistogramBin = {
  x0: number;
  x1: number;
  mid: number;
  label: string;
  total: number;
  scenarioTotals: Map<string, number>;
};

type HistogramResult = {
  bins: HistogramBin[];
  scenarios: Array<{ id: string; label: string; color: string }>;
  min: number;
  max: number;
};

type DensityRange = { key: string; range: [number, number]; color: string };

const HPD_COLORS: Record<string, string> = {
  p95: "rgba(59,130,246,0.08)",
  p80: "rgba(59,130,246,0.12)",
  p50: "rgba(250,204,21,0.18)",
};

const KERNEL_COLOR = "#FACC15";
const MARKET_COLOR = "#38BDF8";
const HIST_COLOR = "rgba(255,255,255,0.25)";
const HIST_BORDER = "rgba(255,255,255,0.38)";

export interface TerminalDistributionProps {
  prices: number[];
  density?: TerminalDensitySummary | null;
  scenarioMeta?: TerminalSampleMeta[] | null;
  spot?: number | null;
}

export default function TerminalDistribution({
  prices,
  density,
  scenarioMeta,
  spot,
}: TerminalDistributionProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<ChartJS | null>(null);
  const [marketEnabled, setMarketEnabled] = useState(false);
  const marketSeenRef = useRef(false);

  const histogram = useMemo(
    () => buildHistogram(prices, scenarioMeta, (density as any)?.histogram?.bins?.length ?? 30),
    [prices, scenarioMeta, density]
  );

  const kdePoints = useMemo(() => {
    const xs = Array.isArray(density?.kde?.x) ? density?.kde?.x : [];
    const ys = Array.isArray(density?.kde?.y) ? density?.kde?.y : [];
    if (!xs || !ys || xs.length !== ys.length || xs.length === 0) return [];
    return xs.map((x, idx) => {
      const y = Number(ys[idx]);
      return {
        x: Number.isFinite(x) ? Number(x) : 0,
        y: Number.isFinite(y) ? y : 0,
      };
    });
  }, [density]);

  const marketSeries = useMemo(() => {
    const market = (density as Record<string, any> | undefined)?.market;
    if (!market) return null;
    const xs = Array.isArray(market?.x) ? market.x : Array.isArray(market?.points) ? market.points.map((p: any) => p?.[0]) : [];
    const ys = Array.isArray(market?.y) ? market.y : Array.isArray(market?.points) ? market.points.map((p: any) => p?.[1]) : [];
    if (!xs?.length || xs.length !== ys.length) return null;
    return {
      label: typeof market?.label === "string" ? market.label : "Market-implied",
      points: xs.map((x: any, idx: number) => ({
        x: Number.isFinite(x) ? Number(x) : 0,
        y: Number.isFinite(ys[idx]) ? Number(ys[idx]) : 0,
      })),
    };
  }, [density]);

  const hpdRanges: DensityRange[] = useMemo(() => {
    if (!density?.hpd) return [];
    const entries: DensityRange[] = [];
    (["p95", "p80", "p50"] as const).forEach((key) => {
      const range = density.hpd?.[key];
      if (
        Array.isArray(range) &&
        range.length >= 2 &&
        typeof range[0] === "number" &&
        typeof range[1] === "number"
      ) {
        entries.push({
          key,
          range: [range[0], range[1]],
          color: HPD_COLORS[key] ?? "rgba(255,255,255,0.08)",
        });
      }
    });
    return entries;
  }, [density]);

  const mostLikely = useMemo(() => {
    if (typeof density?.mode === "number" && Number.isFinite(density.mode)) return density.mode;
    if (typeof density?.median === "number" && Number.isFinite(density.median)) return density.median;
    return null;
  }, [density]);

  useEffect(() => {
    const hasMarket = !!marketSeries?.points?.length;
    if (hasMarket && !marketSeenRef.current) {
      marketSeenRef.current = true;
      setMarketEnabled(true);
    }
    if (!hasMarket && marketSeenRef.current) {
      marketSeenRef.current = false;
      setMarketEnabled(false);
    }
  }, [marketSeries]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const densityOverlay: Plugin<"bar"> = {
      id: "terminalDensityOverlay",
      beforeDatasetsDraw(chart) {
        const { ctx: c, chartArea } = chart;
        const xScale: any = chart.scales.x;
        if (!hpdRanges.length) return;
        c.save();
        hpdRanges.forEach(({ range, color }) => {
          const x0 = xScale.getPixelForValue(range[0]);
          const x1 = xScale.getPixelForValue(range[1]);
          c.fillStyle = color;
          c.fillRect(x0, chartArea.top, x1 - x0, chartArea.bottom - chartArea.top);
        });
        c.restore();
      },
      afterDatasetsDraw(chart) {
        const { ctx: c, chartArea } = chart;
        const xScale: any = chart.scales.x;
        if (mostLikely !== null) {
          const x = xScale.getPixelForValue(mostLikely);
          c.save();
          c.strokeStyle = KERNEL_COLOR;
          c.lineWidth = 1.5;
          c.beginPath();
          c.moveTo(x, chartArea.top);
          c.lineTo(x, chartArea.bottom);
          c.stroke();

          c.fillStyle = "#0A0A0A";
          c.beginPath();
          c.arc(x, chartArea.top + 12, 6, 0, Math.PI * 2);
          c.fill();
          c.strokeStyle = KERNEL_COLOR;
          c.lineWidth = 2;
          c.beginPath();
          c.arc(x, chartArea.top + 12, 6, 0, Math.PI * 2);
          c.stroke();

          const pct =
            typeof spot === "number" && Number.isFinite(spot) && spot
              ? ((mostLikely / spot - 1) * 100)
              : null;
          const label = `Mode $${mostLikely.toFixed(2)}${
            Number.isFinite(pct ?? NaN) ? ` (${(pct as number).toFixed(1)}%)` : ""
          }`;
          c.font = "11px Inter, system-ui, sans-serif";
          c.textAlign = "right";
          c.textBaseline = "top";
          c.fillStyle = "rgba(250,204,21,0.9)";
          c.fillText(label, x - 8, chartArea.top + 2);
          c.restore();
        }

        if (marketEnabled && marketSeries?.points?.length) {
          c.save();
          c.font = "10px Inter, system-ui, sans-serif";
          c.textAlign = "right";
          c.textBaseline = "bottom";
          c.fillStyle = "rgba(56,189,248,0.85)";
          c.fillText(marketSeries.label, chartArea.right - 4, chartArea.top + 4);
          c.restore();
        }
      },
    };

    const datasets: ChartDataset<"bar", { x: number; y: number }[]>[] = [];

    if (histogram.scenarios.length) {
      histogram.scenarios.forEach((scenario) => {
        datasets.push({
          label: scenario.label,
          data: histogram.bins.map((bin) => ({
            x: bin.mid,
            y: bin.scenarioTotals.get(scenario.id) ?? 0,
          })),
          backgroundColor: scenario.color,
          borderColor: scenario.color,
          borderWidth: 0,
          stack: "scenarios",
          parsing: false,
          barPercentage: 1.0,
          categoryPercentage: 1.0,
        } as ChartDataset<"bar", { x: number; y: number }[]>);
      });
    } else {
      datasets.push({
        label: "Histogram",
        data: histogram.bins.map((bin) => ({ x: bin.mid, y: bin.total })),
        backgroundColor: HIST_COLOR,
        borderColor: HIST_BORDER,
        borderWidth: 1,
        parsing: false,
        barPercentage: 1.0,
        categoryPercentage: 1.0,
      });
    }

    if (kdePoints.length) {
      datasets.push({
        type: "line",
        label: "Posterior density",
        data: kdePoints,
        borderColor: KERNEL_COLOR,
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
        tension: 0.35,
        yAxisID: "density",
        parsing: false,
      } as unknown as ChartDataset<"bar", { x: number; y: number }[]>);
    }

    if (marketEnabled && marketSeries?.points?.length) {
      datasets.push({
        type: "line",
        label: marketSeries.label,
        data: marketSeries.points,
        borderColor: MARKET_COLOR,
        borderWidth: 1,
        borderDash: [4, 3],
        pointRadius: 0,
        fill: false,
        tension: 0.3,
        yAxisID: "density",
        parsing: false,
      } as unknown as ChartDataset<"bar", { x: number; y: number }[]>);
    }

    const options: ChartOptions<"bar"> = {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: {
        x: {
          type: "linear",
          grid: { color: "rgba(255,255,255,0.08)" },
          ticks: {
            color: "rgba(255,255,255,0.6)",
            maxTicksLimit: 8,
            callback(value) {
              return typeof value === "number" ? value.toFixed(0) : value;
            },
          },
        },
        y: {
          beginAtZero: true,
          position: "left",
          grid: { color: "rgba(255,255,255,0.08)" },
          ticks: { color: "rgba(255,255,255,0.6)" },
          stacked: !!histogram.scenarios.length,
        },
        density: {
          beginAtZero: true,
          position: "right",
          grid: { drawOnChartArea: false },
          ticks: {
            color: "rgba(255,255,255,0.4)",
            callback(value) {
              return typeof value === "number" ? value.toFixed(2) : value;
            },
          },
        },
      },
      plugins: {
        legend: { display: histogram.scenarios.length > 0 || marketEnabled || !!kdePoints.length },
        tooltip: {
          backgroundColor: "rgba(17,17,17,0.95)",
          titleColor: "#fff",
          bodyColor: "#e5e7eb",
          borderColor: "rgba(255,255,255,0.12)",
          borderWidth: 1,
          callbacks: {
            title: (items) => {
              const idx = items?.[0]?.dataIndex ?? 0;
              return histogram.bins[idx]?.label ?? "";
            },
            label: (ctx) => {
              const label = ctx.dataset.label ?? "";
              const parsed = typeof ctx.parsed?.y === "number" ? ctx.parsed.y : null;
              const raw = ctx.raw as any;
              const fallback =
                raw && typeof raw === "object" && typeof raw.y === "number"
                  ? raw.y
                  : typeof raw === "number"
                  ? raw
                  : null;
              const val = parsed ?? fallback ?? 0;
              return ` ${label}: ${Number(val).toFixed(2)}`;
            },
          },
        },
      },
    };

    const chart = new Chart(ctx, {
      type: "bar",
      data: {
        datasets: datasets as any,
      },
      options,
      plugins: [densityOverlay],
    });

    chartRef.current = chart;

    return () => {
      chart.destroy();
      chartRef.current = null;
    };
  }, [densityOverlayDepsKey(histogram, kdePoints, marketSeries, marketEnabled, hpdRanges, mostLikely, spot)]);

  return (
    <div className="flex h-full flex-col">
      {marketSeries?.points?.length ? (
        <div className="mb-2 flex justify-end text-xs text-white/60">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-3 w-3 rounded border-white/30 bg-black/60"
              checked={marketEnabled}
              onChange={(e) => setMarketEnabled(e.target.checked)}
            />
            Market implied
          </label>
        </div>
      ) : null}
      <div className="relative h-full">
        <canvas ref={canvasRef} className="h-full w-full" />
      </div>
    </div>
  );
}

function buildHistogram(values: number[], meta?: TerminalSampleMeta[] | null, binCount = 30): HistogramResult {
  const sanitized = Array.isArray(values)
    ? values
        .map((value, idx) => ({
          value: Number(value),
          meta: Array.isArray(meta) ? meta[idx] : undefined,
        }))
        .filter((item) => Number.isFinite(item.value))
    : [];

  if (!sanitized.length) {
    return { bins: [], scenarios: [], min: 0, max: 0 };
  }

  const min = Math.min(...sanitized.map((s) => s.value));
  const max = Math.max(...sanitized.map((s) => s.value));
  const span = max - min || 1;
  const binsCount = Math.max(5, Math.min(120, binCount));
  const binWidth = span / binsCount;

  const bins: HistogramBin[] = Array.from({ length: binsCount }, (_, idx) => {
    const x0 = min + idx * binWidth;
    const x1 = x0 + binWidth;
    const mid = x0 + binWidth / 2;
    return {
      x0,
      x1,
      mid,
      label: `${formatNum(x0)} – ${formatNum(x1)}`,
      total: 0,
      scenarioTotals: new Map<string, number>(),
    };
  });

  const palette = [
    "#38BDF8",
    "#22C55E",
    "#F97316",
    "#F43F5E",
    "#818CF8",
    "#A855F7",
    "#FBBF24",
    "#34D399",
  ];
  const scenarioLookup = new Map<
    string,
    {
      id: string;
      label: string;
      color: string;
    }
  >();

  const metaEnabled = Array.isArray(meta) && meta.length === values.length;

  sanitized.forEach(({ value, meta: sampleMeta }) => {
    const clamped = Math.max(0, Math.min(binsCount - 1, Math.floor((value - min) / binWidth)));
    const bin = bins[clamped];
    const weight =
      metaEnabled && typeof sampleMeta?.weight === "number" && Number.isFinite(sampleMeta.weight)
        ? Number(sampleMeta.weight)
        : 1;
    bin.total += weight;

    if (metaEnabled) {
      const scenarioId =
        typeof sampleMeta?.scenario_id === "string"
          ? sampleMeta.scenario_id
          : typeof sampleMeta?.label === "string"
          ? sampleMeta.label
          : null;
      if (scenarioId) {
        if (!scenarioLookup.has(scenarioId)) {
          const color =
            typeof sampleMeta?.color === "string" && sampleMeta.color.trim()
              ? sampleMeta.color
              : palette[scenarioLookup.size % palette.length];
          scenarioLookup.set(scenarioId, {
            id: scenarioId,
            label: sampleMeta?.label ?? scenarioId,
            color,
          });
        }
        const scenario = scenarioLookup.get(scenarioId)!;
        bin.scenarioTotals.set(scenario.id, (bin.scenarioTotals.get(scenario.id) ?? 0) + weight);
      }
    }
  });

  return {
    bins,
    scenarios: Array.from(scenarioLookup.values()),
    min,
    max,
  };
}

function densityOverlayDepsKey(
  histogram: HistogramResult,
  kdePoints: Array<{ x: number; y: number }>,
  marketSeries: { label: string; points: Array<{ x: number; y: number }> } | null,
  marketEnabled: boolean,
  hpdRanges: DensityRange[],
  mostLikely: number | null,
  spot: number | null | undefined
) {
  return JSON.stringify({
    bins: histogram.bins.map((b) => [b.mid, b.total, Array.from(b.scenarioTotals.entries())]),
    scenarios: histogram.scenarios,
    kde: kdePoints,
    market: marketEnabled ? marketSeries : null,
    hpd: hpdRanges,
    mode: mostLikely,
    spot: spot ?? null,
  });
}

function formatNum(n: number) {
  return Number(n).toFixed(2);
}
