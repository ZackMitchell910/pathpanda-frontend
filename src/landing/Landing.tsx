// src/Landing.tsx
import React, { useState } from "react";
import { motion } from "framer-motion";
import NavBar from "@/components/marketing/NavBar";
import BackgroundOrbs from "@/components/marketing/BackgroundOrbs";
import HeroFanChartLanding from "@/components/marketing/HeroFanChartLanding";
import IntegrationsRow from "@/components/marketing/IntegrationsRow";
import Footer from "@/components/marketing/Footer";

// ---- Browser-safe API base (Vite + Netlify) ----
const RAW_API_BASE =
  (typeof window !== "undefined" && (window as any).__PP_API_BASE__) ||
  (import.meta as any)?.env?.VITE_PREDICTIVE_API ||
  (typeof process !== "undefined" && (process as any)?.env?.NEXT_PUBLIC_BACKEND_URL) ||
  "https://pathpanda-api.onrender.com";

const API_BASE = RAW_API_BASE.replace(/\/+$/, "");
const api = (p: string) => `${API_BASE}${p}`;

function HealthCheck() {
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "fail">("idle");
  const [detail, setDetail] = useState("");

  async function run() {
    setStatus("loading");
    setDetail("");
    try {
      const r = await fetch(api("/health"), { headers: { Accept: "application/json" } });
      const txt = await r.text().catch(() => "");
      setDetail(txt || (r.ok ? "OK" : `HTTP ${r.status}`));
      setStatus(r.ok ? "ok" : "fail");
    } catch (e: any) {
      setDetail(e?.message || String(e));
      setStatus("fail");
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center gap-3">
        <button
          onClick={run}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 transition"
        >
          Recheck /health
        </button>
        <span
          className={
            status === "ok"
              ? "text-emerald-400"
              : status === "fail"
              ? "text-rose-400"
              : status === "loading"
              ? "text-yellow-400"
              : "text-gray-400"
          }
        >
          {status === "idle" && "Idle"}
          {status === "loading" && "Checking..."}
          {status === "ok" && "Backend OK"}
          {status === "fail" && "Backend unreachable"}
        </span>
      </div>
      {detail && (
        <pre className="mt-3 whitespace-pre-wrap text-xs opacity-75 border border-white/10 rounded-xl p-3 bg-white/5">
          {detail}
        </pre>
      )}
    </section>
  );
}

export default function Landing() {
  const gradientBg =
    "bg-[radial-gradient(1200px_600px_at_70%_-10%,rgba(52,211,153,0.18),transparent_60%),radial-gradient(800px_400px_at_10%_20%,rgba(125,211,252,0.14),transparent_60%)]";

  return (
    <main className={`relative min-h-screen bg-[#0A111A] text-[#F9F8F3] ${gradientBg}`}>
      <BackgroundOrbs />
      <NavBar />

      <section className="max-w-6xl mx-auto px-4 pt-8 pb-4">
        <motion.h1
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="text-4xl md:text-6xl font-semibold leading-tight"
        >
          Predict markets before they move.
        </motion.h1>
        <p className="mt-4 max-w-2xl text-white/75">
          Simetrix runs thousands of Monte Carlo paths to forecast prices, explain drivers, and learn in real time.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <a
            href="/app"
            className="rounded-lg px-5 py-3 bg-emerald-400 text-[#0A111A] font-semibold hover:brightness-110 transition"
          >
            Run a Simulation
          </a>
          <a
            href="#product"
            className="rounded-lg px-5 py-3 border border-white/20 hover:border-white/40 transition"
          >
            Watch Demo
          </a>
        </div>
        <div className="mt-10">
          <HeroFanChartLanding />
        </div>
      </section>

      <HealthCheck />

      <IntegrationsRow />

      <section id="product" className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-3xl font-semibold mb-2">Open the Dashboard</h2>
            <p className="opacity-80 mb-4">
              Forecasts, fan charts, scenarios, and execution — live in <code>/app</code>.
            </p>
            <a
              href="/app"
              className="inline-block px-5 py-3 rounded-xl bg-white text-black font-medium hover:opacity-90 transition"
            >
              Go to /app
            </a>
          </div>
          <div className="rounded-2xl border border-white/10 p-4 bg-white/5">
            {/* Optional: add a small screenshot or animated preview */}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
