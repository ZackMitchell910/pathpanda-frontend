// main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import App from "./App";
import Landing from "@/landing/Landing";
import DocsPage from "./Docs";
import "@/debug/hookGlobalErrors";
import "./globals.css";
import { inject } from '@vercel/analytics';
import "chart.js/auto";
import HowItWorksPage from "./HowItWorks";
import MarketSimulatorComingSoon from "./pages/MarketSimulatorComingSoon";
import ProductsPage from "./pages/Products";
import AdminDashboard from "./pages/AdminDashboard";
import TraderDashboard from "./pages/TraderDashboard";
import TraderDocs from "./docs/TraderDocs";

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
        <Route path="/docs" element={<DocsPage />} />  
        <Route path="/docs/trader" element={<TraderDocs />} />
        <Route path="/market-simulator" element={<MarketSimulatorComingSoon />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/trader" element={<TraderDashboard />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
