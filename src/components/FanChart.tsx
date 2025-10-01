// components/FanChart.tsx
import React from "react";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  Filler
);

type FanChartData = {
  symbol: string;
  horizon_days: number;
  prob_up_end: number;
  median_path: [number, number][];
  bands: {
    p50: [number, number][];
    p80_low: [number, number][];
    p80_high: [number, number][];
    p95_low: [number, number][];
    p95_high: [number, number][];
  };
};

export type FanChartProps = { data: FanChartData };

export const FanChart: React.FC<FanChartProps> = ({ data }) => {
  const labels = data.median_path.map(([t]) => `D${t}`);

  const arrY = (pairs: [number, number][]) => pairs.map(([, y]) => y);

  const ds = [
    // 95% band fill
    {
      label: "95% Low",
      data: arrY(data.bands.p95_low),
      borderColor: "rgba(0,0,0,0)",
      backgroundColor: "rgba(59,130,246,0.08)", // soft blue
      fill: "+1",
      pointRadius: 0,
      tension: 0.25,
      order: 1,
    },
    {
      label: "95% High",
      data: arrY(data.bands.p95_high),
      borderColor: "rgba(0,0,0,0)",
      backgroundColor: "rgba(59,130,246,0.08)",
      fill: false,
      pointRadius: 0,
      tension: 0.25,
      order: 1,
    },
    // 80% band fill
    {
      label: "80% Low",
      data: arrY(data.bands.p80_low),
      borderColor: "rgba(0,0,0,0)",
      backgroundColor: "rgba(59,130,246,0.16)",
      fill: "+1",
      pointRadius: 0,
      tension: 0.25,
      order: 2,
    },
    {
      label: "80% High",
      data: arrY(data.bands.p80_high),
      borderColor: "rgba(0,0,0,0)",
      backgroundColor: "rgba(59,130,246,0.16)",
      fill: false,
      pointRadius: 0,
      tension: 0.25,
      order: 2,
    },
    // Median path
    {
      label: "Median",
      data: arrY(data.median_path),
      borderColor: "#9FE88D",
      backgroundColor: "rgba(159,232,141,0.15)",
      pointRadius: 0,
      tension: 0.25,
      order: 3,
    },
  ];

  return (
    <div className="w-full h-[360px]">
      <Line
        data={{ labels, datasets: ds }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          normalized: true,
          interaction: { mode: "nearest", intersect: false },
          plugins: {
            legend: {
              display: true,
              labels: { color: "#cbd5e1", boxWidth: 12, usePointStyle: true },
            },
            tooltip: {
              enabled: true,
              intersect: false,
              displayColors: false,
              callbacks: {
                title: (items) => items[0]?.label ?? "",
              },
            },
            // 👇 no zoom plugin here at all
          },
          scales: {
            x: {
              grid: { color: "rgba(148,163,184,0.1)" },
              ticks: { color: "#94a3b8", maxTicksLimit: 12 },
            },
            y: {
              grid: { color: "rgba(148,163,184,0.1)" },
              ticks: { color: "#94a3b8" },
            },
          },
        }}
      />
    </div>
  );
};
