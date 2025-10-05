import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Chart.js setup (must register once)
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  Legend
);

// High-contrast defaults to avoid “invisible” lines on dark bg
ChartJS.defaults.color = "#E5E7EB"; // text
ChartJS.defaults.borderColor = "rgba(148,163,184,0.25)"; // grid faint

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
