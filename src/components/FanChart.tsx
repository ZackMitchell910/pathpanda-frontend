import React from "react";
import { Line } from "react-chartjs-2";
import type { ChartData, ChartOptions } from "chart.js";

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

const BLUE = "#60A5FA";         // median
const TEAL = "#34D399";         // 80 band
const PURPLE = "#A78BFA";       // 95 band
const AREA80 = "rgba(52,211,153,0.15)";
const AREA95 = "rgba(167,139,250,0.12)";

export default function FanChart({ data }: { data: MCArtifact }) {
  const { symbol, horizon_days, median_path, bands } = data;

  const labels = median_path.map(([i]) => `D${i}`);
  const yMedian = median_path.map(([, v]) => v);
  const y80Low = bands.p80_low.map(([, v]) => v);
  const y80High = bands.p80_high.map(([, v]) => v);
  const y95Low = bands.p95_low.map(([, v]) => v);
  const y95High = bands.p95_high.map(([, v]) => v);

  const chartData: ChartData<"line"> = {
    labels,
    datasets: [
      // 95% area
      {
        label: "95% band",
        data: y95High,
        borderWidth: 0,
        backgroundColor: AREA95,
        fill: { target: 3, above: AREA95, below: AREA95 }, // pair with 95 low (index 3)
        pointRadius: 0,
      },
      // 80% area
      {
        label: "80% band",
        data: y80High,
        borderWidth: 0,
        backgroundColor: AREA80,
        fill: { target: 4, above: AREA80, below: AREA80 }, // pair with 80 low (index 4)
        pointRadius: 0,
      },
      // 95% low (invisible line; only used as fill target)
      { label: "_95_low", data: y95Low, borderWidth: 0, pointRadius: 0 },
      // 80% low (invisible line; only used as fill target)
      { label: "_80_low", data: y80Low, borderWidth: 0, pointRadius: 0 },
      // Median line (visible)
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


  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
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
    plugins: {
      legend: { display: true },
      tooltip: { enabled: true },
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
