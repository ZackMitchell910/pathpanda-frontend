// main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import App from "./App";
import Landing from "@/landing/Landing";
import DocsPage from "./Docs";              // ← add
import "@/debug/hookGlobalErrors";
import "./globals.css";
import { inject } from '@vercel/analytics';
import "chart.js/auto";

if (import.meta.env.PROD) {
  inject();
}
import { injectSpeedInsights } from '@vercel/speed-insights';

if (import.meta.env.PROD) {
  injectSpeedInsights();
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<App />} />
        <Route path="/docs" element={<DocsPage />} />  {/* ← add */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
