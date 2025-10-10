// src/Docs.tsx
import React from "react";

export default function DocsPage() {
  return (
    <main className="min-h-screen">
      <section className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-3xl md:text-4xl font-semibold">Documentation</h1>
        <p className="mt-2 text-white/70">
          Legal, policy, and technical information for SIMETRIX. Beta—subject to change.
        </p>

        {/* Disclaimer */}
        <div id="disclaimer" className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold">Disclaimer</h2>
          <p className="mt-2 text-sm text-white/70">
            SIMETRIX is an analytics and visualization tool. It does not provide investment, legal, tax,
            or accounting advice. Markets involve risk, including the possible loss of principal. Past
            performance is not indicative of future results. You are solely responsible for any decisions
            or outcomes resulting from your use of SIMETRIX.
          </p>
        </div>

        {/* Privacy Policy */}
        <div id="privacy" className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold">Privacy Policy</h2>
          <ul className="mt-2 text-sm text-white/70 list-disc pl-5 space-y-2">
            <li><span className="text-white">Data we collect:</span> account details (e.g., email), app usage events, logs, and technical diagnostics.</li>
            <li><span className="text-white">How we use data:</span> to operate the service, improve features, ensure security, and comply with law.</li>
            <li><span className="text-white">Storage & retention:</span> data is stored with reputable cloud providers; retention is limited to operational needs.</li>
            <li><span className="text-white">Third-party services:</span> we may use providers for hosting, analytics, and email. They process data on our behalf.</li>
            <li><span className="text-white">Your choices:</span> you can request access or deletion of personal data (subject to legal/operational constraints).</li>
            <li><span className="text-white">Contact:</span> founders@simetrix.ai for privacy inquiries.</li>
          </ul>
        </div>

        {/* Terms of Use */}
        <div id="terms" className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold">Terms of Use</h2>
          <ul className="mt-2 text-sm text-white/70 list-disc pl-5 space-y-2">
            <li><span className="text-white">License:</span> personal or organizational use as permitted by your plan; no resale or redistribution without consent.</li>
            <li><span className="text-white">Acceptable use:</span> no attempts to breach security, scrape without permission, or misuse the service/API.</li>
            <li><span className="text-white">Availability:</span> service is provided “as is”; uptime and features may change during beta.</li>
            <li><span className="text-white">Limitations:</span> to the maximum extent allowed by law, we disclaim warranties and limit liability for indirect damages.</li>
            <li><span className="text-white">Jurisdiction:</span> governed by applicable laws of our place of incorporation; venue as specified in a future master agreement.</li>
          </ul>
        </div>

        {/* Risk Disclosure */}
        <div id="risk" className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold">Risk Disclosure</h2>
          <p className="mt-2 text-sm text-white/70">
            Forecasts, bands, and probabilities are estimates and may be inaccurate. Model behavior can change
            with new data or different market regimes. Do not rely on SIMETRIX for critical decisions without
            independent verification.
          </p>
        </div>

        {/* Technical Overview */}
        <div id="technical" className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold">Technical Overview</h2>
          <ul className="mt-2 text-sm text-white/70 list-disc pl-5 space-y-2">
            <li>Generates probabilistic bands (e.g., P50–P95) and terminal distributions for scenario framing.</li>
            <li>Tracks accuracy over time via cohort lock & settlement windows.</li>
            <li>Feature store for metrics and outcomes; automated labeling and periodic updates.</li>
            <li>REST API for forecasts, metrics, cohorts, and configuration.</li>
            <li>Client app provides interactive charts and export tools.</li>
          </ul>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <a href="/app" className="rounded-lg px-4 py-2 bg-emerald-500/15 ring-1 ring-emerald-400/30 text-emerald-200 hover:brightness-110">
            Open App
          </a>
          <a href="#privacy" className="rounded-lg px-4 py-2 border border-white/15 hover:border-white/30">
            Privacy
          </a>
          <a href="#terms" className="rounded-lg px-4 py-2 border border-white/15 hover:border-white/30">
            Terms
          </a>
          <a href="#risk" className="rounded-lg px-4 py-2 border border-white/15 hover:border-white/30">
            Risk
          </a>
        </div>
      </section>
    </main>
  );
}
