

// =============================================
// File: src/theme/chartTheme.ts
// Global neutral theme for Chart.js (dark background)
// =============================================
import { Chart } from "chart.js/auto";

export const GOLD = "rgba(203,161,53,1)";

let __applied = false;
export function applyChartTheme() {
  if (__applied) return; // idempotent
  __applied = true;

  // Base font/colors
  Chart.defaults.color = "#e5e7eb"; // light gray text
  Chart.defaults.borderColor = "rgba(255,255,255,0.1)";
  Chart.defaults.font.family = "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Inter, Arial";
  Chart.defaults.font.size = 12;

  // Elements
  Chart.defaults.elements.point.radius = 0;
  Chart.defaults.elements.line.tension = 0.2;

  // Layout
  Chart.defaults.maintainAspectRatio = false;

  // Gridlines use a subtle white alpha
  // (Specific scales can override; this serves as a baseline)
  const grid = "rgba(255,255,255,0.08)";
  const axis = "rgba(255,255,255,0.6)";

  // We can’t globally set per-scale grid in defaults cleanly, so rely on components to set
  // but do set tooltip/legend once here.
  Chart.defaults.plugins.legend.display = false;
  Chart.defaults.plugins.tooltip.backgroundColor = "rgba(17,17,17,0.95)";
  Chart.defaults.plugins.tooltip.titleColor = "#fff";
  Chart.defaults.plugins.tooltip.bodyColor = "#e5e7eb";
  Chart.defaults.plugins.tooltip.borderColor = "rgba(255,255,255,0.12)";
  Chart.defaults.plugins.tooltip.borderWidth = 1;

  // Provide helpers for components via CSS variables if needed (optional)
  try {
    const root = document.documentElement;
    root.style.setProperty("--chart-grid", grid);
    root.style.setProperty("--chart-axis", axis);
  } catch {}
}
