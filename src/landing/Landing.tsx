// src/landing/Landing.tsx
import React, { useState } from "react";
import { motion } from "framer-motion";
import NavBar from "@/components/marketing/NavBar";
import BackgroundOrbs from "@/components/marketing/BackgroundOrbs";
import HeroFanChartLanding from "@/components/marketing/HeroFanChartLanding";
import IntegrationsRow from "@/components/marketing/IntegrationsRow";
import Footer from "@/components/marketing/Footer";

const RAW_API_BASE =
  (typeof window !== "undefined" && (window as any).__PP_API_BASE__) ||
  (import.meta as any)?.env?.VITE_PREDICTIVE_API ||
  (typeof process !== "undefined" && (process as any)?.env?.NEXT_PUBLIC_BACKEND_URL) ||
  "https://pathpanda-api.onrender.com";

type Health = { ok: boolean } & Record<string, unknown>;
const SHOW_HEALTH = import.meta.env.DEV || import.meta.env.VITE_SHOW_HEALTH === "1";

export default function Landing() {
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "fail">("idle");
  const [health, setHealth] = useState<Health | null>(null);

  async function recheckHealth() {
    try {
      setStatus("loading");
      const r = await fetch(`${RAW_API_BASE}/health`, { cache: "no-store" });
      const j = (await r.json()) as Health;
      setHealth(j);
      setStatus(j.ok ? "ok" : "fail");
    } catch {
      setStatus("fail");
    }
  }

  return (
    <main className="relative min-h-screen bg-[#0B0F17] text-white overflow-x-hidden">
      <BackgroundOrbs />
      <NavBar />

      {/* HERO */}
      <section className="max-w-6xl mx-auto px-4 pt-14">
        <div className="text-center">
          <motion.h1
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.35 }}
            className="font-brand text-4xl md:text-6xl leading-tight tracking-tight"
          >
            Predict markets before they move.
          </motion.h1>

          <motion.p
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.45, delay: 0.05 }}
            className="mt-3 text-white/70 max-w-2xl mx-auto"
          >
            Simetrix runs thousands of Monte Carlo paths to forecast prices, explain drivers, and learn in real time.
          </motion.p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a
              href="/app"
              className="rounded-xl px-4 py-2 bg-emerald-600 hover:bg-emerald-500 transition font-semibold"
            >
              Run a Simulation
            </a>
            <a
              href="#demo"
              className="rounded-xl px-4 py-2 border border-white/15 hover:border-white/30 transition"
            >
              Watch Demo
            </a>
          </div>
        </div>

        {/* Fan chart teaser */}
        <div className="mt-10">
          <HeroFanChartLanding />
        </div>
        {/* Health row (dev/opt-in only) */}
        {SHOW_HEALTH && (
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={recheckHealth}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 transition"
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
                  : "text-white/60"
              }
            >
              {status === "idle" && "Idle"}
              {status === "loading" && "Checking…"}
              {status === "ok" && "Backend OK"}
              {status === "fail" && "Backend Error"}
            </span>

            {import.meta.env.DEV && health && (
              <pre className="ml-2 max-w-full overflow-auto text-xs text-white/70 bg-white/5 border border-white/10 rounded-lg p-2">
                {JSON.stringify(health, null, 2)}
              </pre>
            )}
          </div>
        )}

      {/* Integrations row */}
      <IntegrationsRow />

      {/* “Open the Dashboard” block */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-6 items-center">
          <div>
            <h3 className="font-brand text-2xl">Open the Dashboard</h3>
            <p className="mt-2 text-white/70">
              Forecasts, fan charts, scenarios, and execution — live in <code className="text-white">/app</code>.
            </p>
            <a
              href="/app"
              className="mt-4 inline-block rounded-lg px-3 py-2 border border-white/15 hover:border-white/30 transition"
            >
              Open the Dashboard
            </a>
          </div>
          <div className="rounded-2xl border border-white/10 p-4 bg-white/5">
            {/* Optional: add a static screenshot or tiny animation */}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
