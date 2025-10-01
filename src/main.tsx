// frontend/src/main.tsx
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

/* ---- Chart.js global ivory theme ---- */
import { Chart } from "chart.js";
// If you use the Colors plugin, you can register it; not required for this theme.
// import { Colors } from "chart.js";
// Chart.register(Colors);

const IVORY = "#FFFFF0";
const GRID  = "rgba(255, 255, 240, 0.18)";

// Axis/labels/grid
Chart.defaults.color = IVORY;                  // default text/ticks
Chart.defaults.borderColor = GRID;             // axis border
Chart.defaults.scale.grid.color = GRID;        // grid lines

// Elements (lines, bars, points)
Chart.defaults.elements.line.borderColor   = IVORY;
Chart.defaults.elements.line.backgroundColor = "transparent";
Chart.defaults.elements.bar.backgroundColor = IVORY;
Chart.defaults.elements.bar.borderColor    = IVORY;
Chart.defaults.elements.point.backgroundColor = IVORY;
Chart.defaults.elements.point.borderColor  = IVORY;

// Plugins (legend, tooltip)
Chart.defaults.plugins.legend.labels.color   = IVORY;
Chart.defaults.plugins.tooltip.titleColor    = IVORY;
Chart.defaults.plugins.tooltip.bodyColor     = IVORY;
Chart.defaults.plugins.tooltip.borderColor   = GRID;
/* ------------------------------------- */

createRoot(document.getElementById("root")!).render(<App />);
