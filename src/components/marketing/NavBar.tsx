// NavBar.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LogoTwinCore from "@/components/branding/LogoTwinCore";

const links = [
  { href: "#product", label: "Product", hasMenu: true }, // 🧩
  { href: "/docs", label: "Docs" },
  { href: "#pricing", label: "Pricing" },
  { href: "#contact", label: "Contact" },
];

export default function NavBar() {
  const [open, setOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false); // 🧩

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 backdrop-blur bg-black/50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2">
          <LogoTwinCore className="h-6 w-6" />
          <span className="font-semibold tracking-wide">SIMETRIX</span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {links.map((l) =>
            l.hasMenu ? (
              <div
                key={l.label}
                className="relative"
                onMouseEnter={() => setProductOpen(true)}
                onMouseLeave={() => setProductOpen(false)}
              >
                <button className="text-white/80 hover:text-white">{l.label}</button>
                <AnimatePresence>
                  {productOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 mt-2 w-64 rounded-xl border border-white/10 bg-zinc-950/95 shadow-2xl p-2"
                    >
                      <a
                        href="/app"
                        className="block rounded-lg px-3 py-2 hover:bg-white/5"
                      >
                        <div className="text-sm font-medium">SIMETRIX</div>
                        <div className="text-xs text-white/60">
                          Simulations, accuracy tracking, cohorts
                        </div>
                      </a>
                      {/* Future products can slot in here */}
                      {/* <a href="/market-twin" className="block rounded-lg px-3 py-2 hover:bg-white/5">...</a> */}
                      <a
                        href="#product"
                        className="mt-1 block rounded-lg px-3 py-2 hover:bg-white/5 text-xs text-white/60"
                      >
                        Learn more
                      </a>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <a key={l.label} href={l.href} className="text-white/80 hover:text-white">
                {l.label}
              </a>
            )
          )}
          <a
            href="/app"
            className="rounded-lg px-3 py-2 bg-emerald-500/15 ring-1 ring-emerald-400/30 text-emerald-200 font-medium hover:brightness-110 transition"
          >
            Run Simulation
          </a>
        </nav>

        {/* Mobile toggle */}
        <button
          className="md:hidden rounded-lg px-3 py-2 border border-white/15"
          onClick={() => setOpen((v) => !v)}
        >
          Menu
        </button>
      </div>

      {/* Mobile sheet */}
      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="md:hidden border-t border-white/10 bg-black/80 backdrop-blur"
          >
            <div className="px-4 py-3 flex flex-col gap-2">
              {/* Product submenu for mobile */}
              <div className="rounded-lg border border-white/10">
                <div className="px-3 py-2 text-white/80">Product</div>
                <a href="/app" onClick={() => setOpen(false)} className="block px-3 py-2 hover:bg-white/5">
                  Predictive Twin
                </a>
                <a href="#product" onClick={() => setOpen(false)} className="block px-3 py-2 hover:bg-white/5 text-sm text-white/60">
                  Learn more
                </a>
              </div>

              <a href="#docs" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 hover:bg-white/5">
                Docs
              </a>
              <a href="#pricing" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 hover:bg-white/5">
                Pricing
              </a>
              <a href="#contact" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 hover:bg-white/5">
                Contact
              </a>

              <a
                href="/app"
                onClick={() => setOpen(false)}
                className="mt-2 rounded-lg px-3 py-2 bg-emerald-500/15 ring-1 ring-emerald-400/30 text-emerald-200 font-semibold text-center hover:brightness-110 transition"
              >
                Run Simulation
              </a>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
