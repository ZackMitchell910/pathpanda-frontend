import React from "react";
import NavBar from "@/components/marketing/NavBar";
import Footer from "@/components/marketing/Footer";

export default function DocsPage() {
  return (
    <main className="bg-black text-white min-h-screen">
      <NavBar />
      <section className="max-w-5xl mx-auto px-6 md:px-8 py-20">
        <h1 className="font-brand text-4xl md:text-5xl">Documentation & Whitepaper</h1>
        <p className="mt-3 text-white/70 max-w-3xl">
          Overview of SIMETRIX’s predictive platform, including policies, principles, and a conceptual summary of its
          technology stack. This document intentionally omits sensitive implementation details.
        </p>

        {/* --- Whitepaper Summary --- */}
        <div id="whitepaper" className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-brand">Whitepaper Summary</h2>
          <p className="mt-2 text-white/70 text-sm leading-relaxed">
            SIMETRIX operates as a multi-layer predictive intelligence engine designed to forecast market dynamics using
            stochastic simulation, adaptive learning, and quantum-inspired techniques. The platform leverages the
            Simetrix Quant Engine (SQE) ensembles, feature-based scoring, and automated outcome labeling to continuously
            refine its predictive accuracy. Outputs include probabilistic bands (P50–P95), terminal distributions, and
            structured confidence intervals accessible via dashboard or API.
          </p>
          <ul className="mt-4 list-disc pl-5 text-sm text-white/70 space-y-2">
            <li><span className="text-white">Core mission:</span> translate uncertainty into actionable foresight through interpretable AI.</li>
            <li><span className="text-white">Approach:</span> combine statistical simulation with modern ML to model nonlinear market behavior.</li>
            <li><span className="text-white">Data:</span> integrates curated market feeds, derived features, and anonymized signals; no personal data is used for modeling.</li>
            <li><span className="text-white">Governance:</span> emphasizes transparency, reproducibility, and controlled experimentation for institutional trust.</li>
            <li><span className="text-white">Privacy:</span> individual user data is never sold or used for prediction; analytics are aggregate and anonymized.</li>
          </ul>
        </div>

        {/* --- Legal & Policy --- */}
        <div id="legal" className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold">Disclaimer</h2>
            <p className="mt-2 text-sm text-white/70">
              SIMETRIX is an analytics and visualization tool. It does not constitute investment, legal, or tax advice.
              All projections are estimates. You are solely responsible for decisions derived from its insights.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold">Privacy Policy</h2>
            <ul className="mt-2 text-sm text-white/70 list-disc pl-5 space-y-2">
              <li>We collect limited account details, usage telemetry, and diagnostic data.</li>
              <li>Data is encrypted, retained only as necessary, and never shared for advertising purposes.</li>
              <li>Users may request deletion or export of personal data via founders@simetrix.ai.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold">Terms of Use</h2>
            <ul className="mt-2 text-sm text-white/70 list-disc pl-5 space-y-2">
              <li>License limited to authorized users under their respective plans.</li>
              <li>No resale, scraping, or reverse engineering of the platform or API.</li>
              <li>Service provided “as‑is” with no performance guarantees during beta.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold">Risk Disclosure</h2>
            <p className="mt-2 text-sm text-white/70">
              Market forecasts involve uncertainty. SIMETRIX predictions are based on probabilistic models that can be
              wrong under different conditions or data regimes. Independent verification is advised before acting on
              outputs.
            </p>
          </div>
        </div>

        {/* --- Technical Overview --- */}
        <div id="technical" className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-brand">Technical Overview (Simplified)</h2>
          <ul className="mt-3 list-disc pl-5 text-sm text-white/70 space-y-2">
            <li>Core simulation framework executes large-scale Simetrix Quant Engine (SQE) path ensembles per symbol and horizon.</li>
            <li>Dynamic weighting and error tracking enable model adaptation over time (“self‑learning”).</li>
            <li>Feature store and labeling pipeline manage metrics, outcomes, and audit trails securely in‑house.</li>
            <li>REST API provides endpoints for forecasts, accuracy reports, and model metadata.</li>
            <li>Quantum integration layers augment sampling for select research‑grade analyses.</li>
          </ul>
        </div>

        {/* --- Call to action --- */}
        <div className="mt-12 flex flex-wrap gap-3">
          <a href="/app" className="btn-solid text-sm">Open App</a>
          <a href="#whitepaper" className="btn-outline text-sm">Whitepaper</a>
          <a href="#legal" className="btn-outline text-sm">Legal</a>
          <a href="#technical" className="btn-outline text-sm">Technical</a>
        </div>
      </section>
      <Footer />
    </main>
  );
}



