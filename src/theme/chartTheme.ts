// src/theme/chartTheme.ts
// PathPanda chart theme & colors

import { Chart as ChartJS, type ChartOptions, type Chart } from "chart.js";

export const PP_COLORS = {
  bull: "#34D399",
  bear: "#F87171",
  median: "#60A5FA",
  /** translucent band color for p80 shaded area */
  p80: "rgba(96,165,250,0.25)",
  grid: "#1B2431",
  text: "#E5E7EB",
  muted: "#9CA3AF",
  cardBg: "#0E141C",
  cardBorder: "#1B2431",
} as const;

export const PP_CHART_BASE: ChartOptions<any> = {
  responsive: true,
  maintainAspectRatio: false,
  layout: { padding: 8 },
  interaction: { mode: "index", intersect: false },
  plugins: {
    legend: {
      display: true,
      position: "bottom",
      labels: { boxWidth: 10, color: PP_COLORS.text, font: { size: 11 } },
    },
    tooltip: {
      backgroundColor: "rgba(17,17,17,0.95)",
      titleColor: "#fff",
      bodyColor: PP_COLORS.text,
      borderColor: "#27272a",
      borderWidth: 1,
    },
  },
  scales: {
    x: {
      grid: { color: PP_COLORS.grid },
      ticks: { color: PP_COLORS.muted, maxRotation: 0, maxTicksLimit: 8 },
      title: { display: false, text: "" },
    },
    y: {
      grid: { color: PP_COLORS.grid },
      ticks: { color: PP_COLORS.muted, maxTicksLimit: 6 },
      title: { display: false, text: "" },
    },
  },
};

export function applyChartTheme() {
  // guard for SSR
  if (!ChartJS?.defaults) return;

  // Global perf defaults
  ChartJS.defaults.animation = false;
  ChartJS.defaults.responsive = true;
  ChartJS.defaults.maintainAspectRatio = false;
  ChartJS.defaults.elements.point.radius = 0;
  ChartJS.defaults.elements.line.borderWidth = 1;
  ChartJS.defaults.parsing = false;
  ChartJS.defaults.devicePixelRatio = 1;
  ChartJS.defaults.plugins = ChartJS.defaults.plugins || {};
  // If your project includes the decimation plugin via chart.js/auto or a side import,
  // this property is usually fine to set:
  (ChartJS.defaults.plugins as any).decimation = { enabled: true, algorithm: "min-max" };
}

export function withBase<T extends Chart["options"]>(o: T): T {
  return {
    ...(PP_CHART_BASE as any),
    ...(o as any),
    plugins: { ...(PP_CHART_BASE.plugins || {}), ...(o?.plugins || {}) },
    scales: { ...(PP_CHART_BASE.scales || {}), ...(o?.scales || {}) },
  } as T;
}
