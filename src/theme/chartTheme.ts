// src/theme/chartTheme.ts
import {
  Chart,
  CategoryScale,
  LinearScale,
  TimeScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import type { ChartOptions } from "chart.js";

/** Brand colors used across charts */
export const PP_COLORS = {
  bg: "rgba(17,17,20,1)",
  grid: "rgba(255,255,255,0.08)",
  text: "rgba(255,255,255,0.82)",
  subtext: "rgba(255,255,255,0.55)",
  green: "rgba(16,185,129,1)",
  red: "rgba(239,68,68,1)",
  blue: "rgba(59,130,246,1)",
  amber: "rgba(245,158,11,1)",
};
export const GOLD  = PP_COLORS.amber;
export const BLUE  = PP_COLORS.blue;
export const GREEN = PP_COLORS.green;
export const RED   = PP_COLORS.red;
export const TEXT  = PP_COLORS.text;
export const GRID  = PP_COLORS.grid;
export const BG    = PP_COLORS.bg;

/** Call once at app start to register plugins + set global defaults */
export function applyChartTheme() {
  Chart.register(
    CategoryScale,
    LinearScale,
    TimeScale,
    PointElement,
    LineElement,
    BarElement,
    Filler,
    Tooltip,
    Legend
  );

  // Global defaults
  Chart.defaults.color = PP_COLORS.text;
  Chart.defaults.borderColor = "rgba(255,255,255,0.12)";
  Chart.defaults.font.family = "Oswald, ui-sans-serif, system-ui, -apple-system";
  Chart.defaults.plugins.legend.display = false;
  Chart.defaults.plugins.tooltip.backgroundColor = "rgba(0,0,0,0.85)";
  Chart.defaults.plugins.tooltip.titleColor = PP_COLORS.text;
  Chart.defaults.plugins.tooltip.bodyColor = PP_COLORS.text;
}

/** Merge chart options with Simetrix base styling per-chart */
export function withBase<TType extends string = "line">(
  opts?: ChartOptions<TType>
): ChartOptions<TType> {
  const base: ChartOptions<TType> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { display: false, labels: { color: PP_COLORS.text, boxWidth: 12 } },
      tooltip: {
        enabled: true,
        intersect: false,
        mode: "index",
        displayColors: false,
        borderColor: "rgba(255,255,255,0.12)",
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: { color: PP_COLORS.grid },
        ticks: { color: PP_COLORS.subtext },
      } as any,
      y: {
        grid: { color: PP_COLORS.grid },
        ticks: { color: PP_COLORS.subtext },
      } as any,
    },
  };
  return deepMerge(base, opts || {}) as ChartOptions<TType>;
}

function deepMerge<T extends Record<string, any>>(a: T, b: Partial<T>): T {
  const out: any = Array.isArray(a) ? [...a] : { ...a };
  for (const [k, v] of Object.entries(b)) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      out[k] = deepMerge((a as any)[k] ?? {}, v as any);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export default {
  applyChartTheme,
  withBase,
  PP_COLORS,
  GOLD, BLUE, GREEN, RED, TEXT, GRID, BG,
};

