import React, { useMemo } from "react";
import { Chart as ChartJS } from "chart.js/auto";
import { Chart as ChartComponent } from "react-chartjs-2";
import type { ChartData, ChartOptions } from "chart.js";
import { withBase } from "../theme/chartTheme";

export type Ptiles = { p05?: number | null; p50?: number | null; p95?: number | null };

type Props = {
  pathsTerminal?: number[];
  prices?: number[];           // <— alias to match App.tsx usage
  ptiles?: { p05?: number | null; p50?: number | null; p95?: number | null };
  height?: number;
};

function formatMaybe(v?: number | null, d = 2) {
  return Number.isFinite(v as number) ? (v as number).toFixed(d) : "—";
}

export default function TerminalDistribution({ pathsTerminal, ptiles, height = 300 }: Props) {
  if (!pathsTerminal?.length) {
    return <div className="text-xs text-zinc-400">No terminal data.</div>;
  }

  // --- Derived stats (memoized) ---
  const derived = useMemo(() => {
    const values = (pathsTerminal && pathsTerminal.length ? pathsTerminal : prices) || [];
    if (!values.length) return <div className="text-xs text-zinc-400">No terminal data.</div>;
    const n = values.length;
    const vMin = values[0];
    const vMax = values[n - 1];

    // Freedman–Diaconis bin width; clamp bins to [20, 80]
    const q = (p: number) => {
      const idx = (n - 1) * p;
      const lo = Math.floor(idx);
      const hi = Math.ceil(idx);
      const t = idx - lo;
      return values[lo] * (1 - t) + values[hi] * t;
    };
    const q25 = q(0.25);
    const q75 = q(0.75);
    const iqr = Math.max(1e-9, q75 - q25);
    const fdw = (2 * iqr) / Math.cbrt(n);
    const rawBins = Math.max(1, Math.floor((vMax - vMin) / Math.max(fdw, 1e-9)));
    const nBins = Math.max(20, Math.min(80, rawBins || 20));
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

    const mids = Array.from({ length: nBins }, (_, i) => vMin + (i + 0.5) * binWidth);
    const labels = mids.map((x) => x.toFixed(2));

    return { n, vMin, vMax, nBins, binWidth, labels, pdf, cdf };
  }, [pathsTerminal]);

  const data: ChartData<"bar" | "line", number[], string> = {
    labels: derived.labels,
    datasets: [
      {
        type: "bar",
        label: "PDF",
        data: derived.pdf,
        yAxisID: "y",
        borderWidth: 0,
        // Use theme fill (withBase sets defaults); keep as semi-opaque fill via scriptable background
        backgroundColor: (ctx) => {
          const c = ctx.chart?.options?.color as string | undefined;
          // fallback tint if theme color not present
          return c ? `${c}55` : "rgba(148,163,184,0.45)"; // zinc-400-ish
        },
        barPercentage: 1.0,
        categoryPercentage: 1.0,
      },
      {
        type: "line",
        label: "CDF",
        data: derived.cdf,
        yAxisID: "y1",
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.15,
      },
    ],
  };

  const options: ChartOptions<"bar" | "line"> = withBase<ChartOptions<"bar" | "line">>({
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items) => `Price ~ ${items[0]?.label ?? ""}`,
          label: (item) =>
            item.dataset.type === "line"
              ? `CDF: ${(Number(item.raw) * 100).toFixed(1)}%`
              : `PDF: ${Number(item.raw).toFixed(4)}`,
        },
      },
    },
    scales: {
      x: {
        ticks: { maxRotation: 0, autoSkip: true },
        title: { display: true, text: "Price" },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        title: { display: true, text: "PDF" },
        grid: { display: true },
      },
      y1: {
        beginAtZero: true,
        max: 1,
        position: "right",
        title: { display: true, text: "CDF" },
        ticks: { callback: (v) => `${(Number(v) * 100).toFixed(0)}%` },
        grid: { display: false },
      },
    },
  });

  // Inline plugin to draw p05/p50/p95 vertical guides without extra deps
  const percentileLines = {
    id: "percentileLines",
    afterDatasetsDraw: (chart: ChartJS) => {
      const ctx = chart.ctx as CanvasRenderingContext2D;
      const xScale = chart.scales.x;
      const area = chart.chartArea;
      const { vMin, binWidth, nBins } = derived;

      const drawLine = (val: number, label: string, strong = false) => {
        if (!Number.isFinite(val)) return;
        const idxFloat = (val - vMin) / binWidth - 0.5; // map to category index space
        const i0 = Math.max(0, Math.min(nBins - 1, Math.floor(idxFloat)));
        const i1 = Math.max(0, Math.min(nBins - 1, Math.ceil(idxFloat)));
        const t = Math.max(0, Math.min(1, idxFloat - Math.floor(idxFloat)));
        const x0 = xScale.getPixelForValue(i0);
        const x1 = xScale.getPixelForValue(i1);
        const x = x0 + (x1 - x0) * t;

        ctx.save();
        ctx.beginPath();
        ctx.setLineDash(strong ? [] : [4, 4]);
        ctx.lineWidth = strong ? 1.5 : 1;
        ctx.strokeStyle = "rgba(255,255,255,0.35)";
        ctx.moveTo(x, area.top);
        ctx.lineTo(x, area.bottom);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = "10px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto";
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.textAlign = "left";
        ctx.fillText(`${label} ${formatMaybe(val)}`, x + 4, area.top + 10);
        ctx.restore();
      };

      if (ptiles?.p05 != null) drawLine(ptiles.p05, "p05");
      if (ptiles?.p50 != null) drawLine(ptiles.p50, "p50", true);
      if (ptiles?.p95 != null) drawLine(ptiles.p95, "p95");
    },
  };

  return (
    <div className="relative w-full" style={{ height }}>
      <ChartComponent type="bar" data={data} options={options} plugins={[percentileLines]} />
      <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] opacity-80">
        <div>p05: {formatMaybe(ptiles?.p05)}</div>
        <div>p50: {formatMaybe(ptiles?.p50)}</div>
        <div>p95: {formatMaybe(ptiles?.p95)}</div>
      </div>
    </div>
  );
}
