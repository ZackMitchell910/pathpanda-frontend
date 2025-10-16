import React, { useEffect } from "react";
import LogoSimetrix from "@/components/branding/LogoSimetrix";

export default function MarketSimulatorComingSoon() {
  useEffect(() => {
    const prev = document.title;
    document.title = "MarketSimulator - Coming Soon";
    return () => {
      document.title = prev;
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 35% at 50% 0%, rgba(96,165,250,0.08) 0%, rgba(96,165,250,0.00) 60%)",
        }}
      />

      <header className="sticky top-0 z-10 border-b border-white/10 bg-black/40 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2 text-sm text-white/60">
            <LogoSimetrix className="h-6 w-auto opacity-90" />
            <span>/ market-simulator</span>
          </div>
          <nav className="text-sm">
            <a href="/" className="text-white/70 transition hover:text-white">
              Home
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4">
        <section className="mt-20 rounded-2xl border border-white/10 bg-white/5 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] md:mt-28">
          <div className="p-8 text-center md:p-10">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-white/70">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-sky-400" />
              MarketSimulator preview track
            </div>

            <h1 className="mt-5 text-3xl font-semibold tracking-tight md:text-4xl">
              Coming Soon
            </h1>
            <p className="mt-3 text-base text-white/70 md:text-lg">
              Run narrative shocks across the synthetic market twin.
            </p>
            <p className="mt-2 text-sm text-white/60">
              We are finalizing the scenario composer, counterfactual replay, and liquidity adapters before opening the beta.
            </p>

            <ul className="mt-8 grid grid-cols-1 gap-3 text-left text-sm text-white/70 sm:grid-cols-3">
              {[
                ["Narrative inputs", "Inject policy paths, macro surprises, and desk notes."],
                ["Synthetic order book", "Replay shocks across correlated assets in seconds."],
                ["Explainable deltas", "Track drivers, liquidity drains, and recovery timelines."],
              ].map(([title, body]) => (
                <li key={title} className="rounded-xl border border-white/10 bg-black/40 p-4">
                  <div className="text-sm font-semibold text-white">{title}</div>
                  <div className="mt-1 text-xs text-white/60">{body}</div>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 text-sm sm:flex-row">
              <a
                href="/"
                className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/10 px-4 py-2 transition hover:bg-white/15"
              >
                Back to landing
              </a>
              <a
                href="mailto:info@simetrix.io?subject=MarketSimulator%20Preview"
                className="inline-flex items-center justify-center rounded-xl border border-sky-400/40 bg-sky-400/15 px-4 py-2 transition hover:bg-sky-400/25"
              >
                Request early access
              </a>
              <a
                href="/docs"
                className="inline-flex items-center justify-center rounded-xl border border-white/15 px-4 py-2 transition hover:bg-white/10"
              >
                Read docs
              </a>
            </div>

            <p className="mt-6 text-xs text-white/50">
              URL: <span className="text-white/70">/market-simulator</span>
            </p>
          </div>
        </section>
        <div className="h-20" />
      </main>
    </div>
  );
}
