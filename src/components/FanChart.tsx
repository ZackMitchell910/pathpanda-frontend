"use client";

import React from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Filler,
  type ChartData,
  type ChartOptions,
  type Chart
} from "chart.js";
import { getRelativePosition } from "chart.js/helpers";

// Register once (safe to keep here if you don't have a ChartJSProvider)
ChartJS.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler);

type MCArtifact = {
  symbol: string;
  horizon_days: number;
  median_path: [number, number][];
  bands: {
    p50: [number, number][];
    p80_low: [number, number][];
    p80_high: [number, number][];
    p95_low: [number, number][];
    p95_high: [number, number][];
  };
};

const BLUE = "#60A5FA";           // median
const AREA80 = "rgba(52,211,153,0.15)";
const AREA95 = "rgba(125,211,252,0.12)"; // cyan-tinted 95

export default function FanChart({ data }: { data: MCArtifact }) {
  const { symbol, horizon_days, median_path, bands } = data;

  const labels = median_path.map(([i]) => `D${i}`);
  const yMedian = median_path.map(([, v]) => v);
  const y80Low = bands.p80_low.map(([, v]) => v);
  const y80High = bands.p80_high.map(([, v]) => v);
  const y95Low = bands.p95_low.map(([, v]) => v);
  const y95High = bands.p95_high.map(([, v]) => v);

  // Order matters for fill targets:
  // [0] 95_high (fills to [2] 95_low)
  // [1] 80_high (fills to [3] 80_low)
  // [2] 95_low  (invisible)
  // [3] 80_low  (invisible)
  // [4] median  (visible)
  const chartData: ChartData<"line"> = {
    labels,
    datasets: [
      {
        label: "95% band",
        data: y95High,
        borderWidth: 0,
        backgroundColor: AREA95,
        fill: { target: 2, above: AREA95, below: AREA95 },
        pointRadius: 0,
      },
      {
        label: "80% band",
        data: y80High,
        borderWidth: 0,
        backgroundColor: AREA80,
        fill: { target: 3, above: AREA80, below: AREA80 },
        pointRadius: 0,
      },
      { label: "_95_low", data: y95Low, borderWidth: 0, pointRadius: 0 },
      { label: "_80_low", data: y80Low, borderWidth: 0, pointRadius: 0 },
      {
        label: "Median",
        data: yMedian,
        borderColor: BLUE,
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.15,
      },
    ],
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    elements: { point: { radius: 0, hoverRadius: 5, hitRadius: 10 } },
    plugins: {
      legend: { display: true },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const label = ctx.dataset?.label ?? "";
            const y = ctx.parsed?.y;
            if (y == null) return label;
            const asPrice =
              (ctx.chart?.scales?.y?.options as any)?.title?.text
                ?.toString()
                ?.toLowerCase()
                ?.includes("price");
            const formatted = asPrice
              ? `$${Number(y).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
              : `${Number(y).toLocaleString(undefined, { maximumFractionDigits: 4 })}`;
            return `${label}: ${formatted}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { maxRotation: 0, autoSkip: true },
        title: { display: true, text: "Days" },
      },
      y: {
        grid: { color: "rgba(148,163,184,0.15)" },
        title: { display: true, text: "Price (USD)" },
      },
    },
    // If you want to add band-hover highlight logic later, use onHover and the
    // same getRelativePosition() approach we used on the landing chart.
    onHover: (e, _els, chart: Chart<"line">) => {
      // Example skeleton for hit-testing bands if you want to adapt later:
      // const { scales } = chart as any;
      // const x = scales.x, y = scales.y;
      // if (!x || !y) return;
      // const pos = getRelativePosition(e, chart);
      // const xVal = x.getValueForPixel(pos.x);
      // if (xVal == null) return;
      // const idx = Math.max(0, Math.min(labels.length - 1, Math.round(Number(xVal))));
      // const yVal = y.getValueForPixel(pos.y);
      // // compare yVal with y80/95 boundaries if needed
    },
  };

  return (
    <div data-chart="fan" className="relative w-full" style={{ height: 320 }}>
      <Line
        data={chartData}
        options={options}
        role="img"
        aria-label={`Fan chart for ${symbol} over ${horizon_days} days with median, 80% and 95% bands`}
      />
    </div>
  );
}
