// src/theme/chartTheme.ts — Tech-Noir defaults + deep gold accent
import { Chart as ChartJS } from "chart.js";

/** Deep, rich gold accent */
export const GOLD = "#CBA135";
export const GOLD_GLOW = "rgba(203,161,53,0.45)";

/** Backward-compatible color map used across components (e.g., Card.tsx) */
export const PP_COLORS = {
  // brand / accent
  gold: GOLD,
  goldGlow: GOLD_GLOW,
  accent: GOLD,

  // monochrome UI
  white: "#FFFFFF",
  fg: "#E5E7EB",
  muted: "#9CA3AF",
  grid: "rgba(255,255,255,0.08)",
  border: "rgba(255,255,255,0.12)",
  bg: "#000000",
  panel: "#0D0D0F",

  // semantic (charts/status)
  green: "#10B981",   // up
  red: "#EF4444",     // down
  indigo: "#6366F1",  // secondary accent (Quick Sim)
  blue: "#3B82F6",
  amber: "#F59E0B",
};

/** Apply global Chart.js dark theme (monochrome grid/labels; charts keep their own colors) */
export function applyChartTheme() {
  const C = ChartJS.defaults;

  // Global text/colors
  C.color = PP_COLORS.fg;
  C.responsive = true;
  C.maintainAspectRatio = false;

  // Font
  C.font.family =
    "'Oswald', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial";

  // Elements
  C.elements.line.borderWidth = 2;
  C.elements.point.radius = 0;

  // Tooltip
  C.plugins.tooltip.backgroundColor = "rgba(0,0,0,0.92)";
  C.plugins.tooltip.borderColor = PP_COLORS.border;
  C.plugins.tooltip.borderWidth = 1;
  C.plugins.tooltip.titleColor = PP_COLORS.white;
  C.plugins.tooltip.bodyColor = PP_COLORS.fg;
  C.plugins.tooltip.displayColors = false;

  // Scales (base defaults)
  // @ts-ignore allow base "scale" defaults
  C.scale = C.scale || {};
  // @ts-ignore
  C.scale.grid = { color: PP_COLORS.grid, drawTicks: false };
  // @ts-ignore
  C.scale.ticks = { color: "#C7C9D1", maxRotation: 0 };
}

/** Optional convenience default (helps if anything used a default import) */
export default { PP_COLORS, GOLD, GOLD_GLOW, applyChartTheme };
