// src/pages/ComingSoon.tsx
import React, { useEffect } from "react";
import LogoSimetrix from "@/components/branding/LogoSimetrix";

export default function ComingSoon() {
  useEffect(() => {
    const prev = document.title;
    document.title = "Simetrix — Coming Soon";
    return () => { document.title = prev; };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 35% at 50% 0%, rgba(251,191,36,0.07) 0%, rgba(251,191,36,0.00) 60%)",
        }}
      />

      <header className="sticky top-0 z-10 backdrop-blur-sm bg-black/30 border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LogoSimetrix className="h-6 w-auto opacity-90" />
            <span className="text-sm text-white/60">/ app</span>
          </div>
          <nav className="text-sm">
            <a href="/" className="text-white/70 hover:text-white transition">Home</a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4">
        <section className="mt-20 md:mt-28 rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
          <div className="p-8 md:p-10 text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-xs text-white/70">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              Private Alpha • Dashboard module
            </div>

            <h1 className="mt-5 text-3xl md:text-4xl font-semibold tracking-tight">
              Coming Soon
            </h1>
            <p className="mt-3 text-white/70 max-w-2xl mx-auto">
              We’re polishing simulations, validation, and daily quant signals so your first run feels rock-solid.
            </p>

            <ul className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
              {[
                ["SQE Fan Charts", "Validated paths, percentile bands, export-ready"],
                ["Targets & Odds", "Vol-aware ladders with time-to-hit stats"],
                ["Daily Quant Signal", "IBM/Qiskit hook + classical blend"],
              ].map(([title, note]) => (
                <li key={title} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-sm font-semibold">{title}</div>
                  <div className="mt-1 text-xs text-white/60">{note}</div>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="/"
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] hover:bg-white/[0.10] px-4 py-2 text-sm transition"
              >
                View Landing
              </a>
              <a
                href="mailto:info@simetrix.io?subject=Simetrix%20Early%20Access"
                className="inline-flex items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/10 hover:bg-amber-400/20 px-4 py-2 text-sm transition"
              >
                Request Early Access
              </a>
              <a
                href="/docs"
                className="inline-flex items-center justify-center rounded-xl border border-white/10 hover:bg-white/[0.06] px-4 py-2 text-sm transition"
              >
                Read Docs
              </a>
            </div>

            <p className="mt-6 text-xs text-white/50">
              URL: <span className="text-white/70">/coming-soon</span>
            </p>
          </div>
        </section>
        <div className="h-20" />
      </main>
    </div>
  );
}

