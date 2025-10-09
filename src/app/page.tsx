"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";

// ---- API base + helpers (works for Vite or Next) ----
const RAW_API_BASE =
  (typeof window !== "undefined" && (window as any).__PP_API_BASE__) ||
  (import.meta as any)?.env?.VITE_PREDICTIVE_API ||  // Vite (Netlify recommended)
  (import.meta as any)?.env?.VITE_API_BASE ||        // Your existing fallback (if present)
  process.env.NEXT_PUBLIC_BACKEND_URL ||             // Next.js style (harmless if undefined)
  "";

const API_BASE = RAW_API_BASE ? RAW_API_BASE.replace(/\/+$/, "") : "";
const api = (p: string) => (API_BASE ? `${API_BASE}${p}` : p);

async function safeText(r: Response) {
  try { return await r.text(); } catch { return "<no body>"; }
}

const PandaIcon = () => (
  <svg className="w-8 h-8 text-[#F9F8F3]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm-4 7c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v2h-8v-2z" />
  </svg>
);

export default function Page() {
  const [health, setHealth] = useState<{ ok?: boolean; redis_ok?: boolean; msg?: string } | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    // initial check on mount
    void runHealthCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runHealthCheck() {
    setChecking(true);
    try {
      const r = await fetch(api("/health"));
      const body = await safeText(r);
      if (!r.ok) throw new Error(`HTTP ${r.status} ${body}`);
      const js = JSON.parse(body);
      setHealth({ ok: js.ok, redis_ok: js.redis_ok });
    } catch (e: any) {
      setHealth({ msg: e?.message || String(e) });
    } finally {
      setChecking(false);
    }
  }

  function copyApiBase() {
    if (!API_BASE) {
      toast.error("API_BASE is empty in this build.");
      return;
    }
    navigator.clipboard.writeText(API_BASE);
    toast.success("API_BASE copied");
  }

  return (
    <main className="min-h-screen bg-[#0b0b0d] text-[#F9F8F3]">
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PandaIcon />
            <h1 className="text-xl font-semibold">PathPanda</h1>
          </div>
          <a
            href="/app"
            className="px-3 py-1 rounded bg-[#13161a] border border-[#23262b] text-sm hover:bg-[#161a20]"
          >
            Open Dashboard →
          </a>
        </header>

        {/* Hero */}
        <section className="mt-14">
          <h2 className="text-4xl font-semibold leading-tight">Predictive Twin for Markets</h2>
          <p className="mt-3 text-sm opacity-80 max-w-2xl">
            Run Monte Carlo price paths with explainable drivers, hit-probabilities, terminal distributions, and more.
          </p>
          <div className="mt-6 flex gap-3">
            <a
              href="/app"
              className="px-4 py-2 rounded bg-white/10 border border-white/20 text-sm hover:bg-white/15"
            >
              Get started
            </a>
            <button
              onClick={runHealthCheck}
              className="px-4 py-2 rounded bg-[#13161a] border border-[#23262b] text-sm"
              disabled={checking}
            >
              {checking ? "Checking /health…" : "Recheck /health"}
            </button>
          </div>
        </section>

        {/* Diagnostics */}
        <section className="mt-10 grid gap-3">
          <div className="rounded-xl bg-[#0f1318] border border-[#23262b] p-4">
            <div className="text-sm font-medium mb-2">Diagnostics</div>
            <div className="text-[11px] leading-5 opacity-90 space-y-1">
              <div>
                API_BASE:{" "}
                <span className="font-mono">{API_BASE || "(empty → relative calls will hit Netlify)"}</span>
                {API_BASE && (
                  <button
                    onClick={copyApiBase}
                    className="ml-2 text-xs underline opacity-80 hover:opacity-100"
                  >
                    copy
                  </button>
                )}
              </div>
              {health ? (
                health.msg ? (
                  <div className="text-[#F87171]">/health error: {health.msg}</div>
                ) : (
                  <div>
                    /health → ok: <span className="font-mono">{String(health.ok)}</span> · redis_ok:{" "}
                    <span className="font-mono">{String(health.redis_ok)}</span>
                  </div>
                )
              ) : (
                <div>Checking /health…</div>
              )}
              <div className="opacity-70">
                Tip: You can override at runtime in DevTools with{" "}
                <code className="font-mono">window.__PP_API_BASE__="https://pathpanda-api.onrender.com"</code> and reload.
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-14 text-xs opacity-60">
          © {new Date().getFullYear()} PathPanda. All rights reserved.
        </footer>
      </div>
    </main>
  );
}
