import React from "react";
import { Chart as ChartJS } from "chart.js/auto";
import { Chart as ChartComponent } from "react-chartjs-2";
import type { ChartData, ChartOptions } from "chart.js";
import { withBase } from "../theme/chartTheme";

export type Ptiles = { p05?: number | null; p50?: number | null; p95?: number | null };

type Props = {
  pathsTerminal: number[];
  ptiles?: Ptiles;
};

export default function TerminalDistribution({ pathsTerminal, ptiles }: Props) {
  if (!pathsTerminal?.length) {
    return <div className="text-xs text-zinc-400">No terminal data.</div>;
  }

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

  const labels = Array.from({ length: nBins }, (_, i) => (vMin + (i + 0.5) * binWidth).toFixed(2));

  const data: ChartData<"bar" | "line", number[], string> = {
    labels,
    datasets: [
      {
        type: "bar",
        label: "PDF",
        data: pdf,
        yAxisID: "y",
        borderWidth: 0,
        backgroundColor: "rgba(99,102,241,0.45)", // indigo-ish
        barPercentage: 1.0,
        categoryPercentage: 1.0,
      },
      {
        type: "line",
        label: "CDF",
        data: cdf,
        yAxisID: "y1",
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.15,
      },
    ],
  };

  const options: ChartOptions<"bar" | "line"> = withBase<ChartOptions<"bar" | "line">>({
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
        grid: { display: false },
      },
    },
  });

  return (
    <div className="relative w-full h-[280px]">
      <ChartComponent type="bar" data={data} options={options} />
      <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] opacity-80">
        {ptiles?.p05 != null && <div>p05: {ptiles.p05.toFixed(2)}</div>}
        {ptiles?.p50 != null && <div>p50: {ptiles.p50.toFixed(2)}</div>}
        {ptiles?.p95 != null && <div>p95: {ptiles.p95.toFixed(2)}</div>}
      </div>
    </div>
  );
}
