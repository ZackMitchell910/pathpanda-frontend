import React from "react";
import NavBar from "@/components/marketing/NavBar";
import Footer from "@/components/marketing/Footer";

export default function TraderDocs() {
  return (
    <main className="min-h-screen bg-black text-white">
      <NavBar />
      <article className="mx-auto max-w-5xl px-6 py-16 md:px-10">
        <header className="space-y-4">
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">Simetrix // Trader</p>
          <h1 className="font-brand text-4xl leading-tight md:text-5xl">AI Trader Integration Notes</h1>
          <p className="max-w-3xl text-sm text-white/65">
            Working specification for the Hyperliquid launch surface and upcoming Coinbase adapter.
            This document focuses on client-facing contracts, auth, and operational guardrails so the
            UI can ship ahead of final websocket availability.
          </p>
        </header>

        <Section title="Environment & Auth">
          <ul className="space-y-3 text-sm text-white/65">
            <li>
              <span className="text-white">Base URL:</span> all trading calls tunnel through the existing
              gateway; use <code className="rounded bg-white/10 px-1 py-0.5 text-xs">/trader/*</code> paths.
            </li>
            <li>
              <span className="text-white">Headers:</span> include <code className="rounded bg-white/10 px-1 py-0.5 text-xs">X-API-Key</code>,
              <code className="rounded bg-white/10 px-1 py-0.5 text-xs">X-Client-Version</code>, and optional
              <code className="rounded bg-white/10 px-1 py-0.5 text-xs">X-Trace-Id</code> for run attribution.
            </li>
            <li>
              <span className="text-white">Quotas:</span> reuse the quota service; POST /run debits credits,
              guardrails returned in the response for UI display.
            </li>
          </ul>
        </Section>

        <Section title="REST Contract">
          <div className="space-y-4 text-sm text-white/65">
            <Endpoint
              method="POST"
              path="/trader/run"
              summary="Launch a strategy execution."
              details={[
                "Body includes symbol(s), exchange, strategy template id, sizing config, and guardrail overrides.",
                "Response returns runId, initial status=queued, effective guardrails, and nextPollAfter (ms).",
                "Errors encode machine codes (e.g., RUN_GUARDRAIL_EXCEEDED) for toast surfaces.",
              ]}
            />
            <Endpoint
              method="GET"
              path="/trader/run/:id/status"
              summary="Poll status until websocket is ready."
              details={[
                "Return fields: phase (queued/running/completed/failed/guardrail_halt), progress (0-1), pnlUsd.",
                "Includes most recent event summary so the UI timeline can hydrate before sockets arrive.",
              ]}
            />
            <Endpoint
              method="GET"
              path="/trader/run/:id/report"
              summary="Full post-trade analytics payload."
              details={[
                "Contains fills, latency histogram, guardrail triggers, and roll-up metrics.",
                "UI renders analytics cards off of this payload; keep schema additive for compatibility.",
              ]}
            />
          </div>
        </Section>

        <Section title="Hyperliquid Websocket (WIP)">
          <p className="text-sm text-white/65">
            While we wait for the upstream HL channel, the UI should continue to poll <code className="rounded bg-white/10 px-1 py-0.5 text-xs">/status</code>
            every <span className="text-white">2s</span> with exponential back-off. Once the websocket is delivered:
          </p>
          <ul className="mt-4 space-y-3 text-sm text-white/65">
            <li>
              Socket URL: <code className="rounded bg-white/10 px-1 py-0.5 text-xs">wss://api.simetrix.ai/trader/hyperliquid</code>.
            </li>
            <li>Auth via initial REST token exchange; refresh every 15 minutes (handled by backend).</li>
            <li>Events: <code className="rounded bg-white/10 px-1 py-0.5 text-xs">fill</code>, <code className="rounded bg-white/10 px-1 py-0.5 text-xs">latency</code>,
              <code className="rounded bg-white/10 px-1 py-0.5 text-xs">guardrail</code>, <code className="rounded bg-white/10 px-1 py-0.5 text-xs">heartbeat</code>.</li>
          </ul>
        </Section>

        <Section title="Operator Runbook">
          <ul className="space-y-3 text-sm text-white/65">
            <li><span className="text-white">Latency spikes:</span> UI displays amber banner when &gt; 500 ms; auto throttles per guardrail config.</li>
            <li><span className="text-white">Guardrail halt:</span> expose “Request reset” action once backend emits <code className="rounded bg-white/10 px-1 py-0.5 text-xs">guardrail_halt</code>.</li>
            <li><span className="text-white">Credential health:</span> poll <code className="rounded bg-white/10 px-1 py-0.5 text-xs">/trader/health</code> every 60s; failures bubble to top card.</li>
            <li><span className="text-white">Audit:</span> every run pushes a journal entry to <code className="rounded bg-white/10 px-1 py-0.5 text-xs">/admin/audit</code> for admin portal review.</li>
          </ul>
        </Section>
      </article>
      <Footer />
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-16">
      <h2 className="text-2xl font-semibold text-white">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Endpoint({
  method,
  path,
  summary,
  details,
}: {
  method: string;
  path: string;
  summary: string;
  details: string[];
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded-md border border-white/15 bg-black/40 px-2 py-1 uppercase tracking-wide text-xs text-white/70">
          {method}
        </span>
        <code className="text-xs text-white/70">{path}</code>
      </div>
      <p className="mt-3 text-sm text-white/65">{summary}</p>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-xs text-white/55">
        {details.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

