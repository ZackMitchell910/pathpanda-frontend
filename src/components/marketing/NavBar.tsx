"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LogoTwinCore from "@/components/branding/LogoTwinCore";

const links = [
  { href: "#product", label: "Product" },
  { href: "#docs", label: "Docs" },
  { href: "#pricing", label: "Pricing" },
  { href: "#contact", label: "Contact" },
];

export default function NavBar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0A111A]/70 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <a href="/" className="flex items-center gap-3">
          <LogoTwinCore size={28} />
          <span className="tracking-wide font-semibold">SIMETRIX</span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm text-white/75">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-white transition">
              {l.label}
            </a>
          ))}
          <a
            href="/app"
            className="rounded-lg px-4 py-2 bg-emerald-400 text-[#0A111A] font-semibold hover:brightness-110 transition"
          >
            Run Simulation
          </a>
        </nav>

        {/* Mobile menu button */}
        <button
          aria-label="Menu"
          onClick={() => setOpen((s) => !s)}
          className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/15 hover:border-white/30"
        >
          <div className="space-y-1">
            <span className="block h-[2px] w-5 bg-white" />
            <span className="block h-[2px] w-5 bg-white" />
            <span className="block h-[2px] w-5 bg-white" />
          </div>
        </button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="md:hidden overflow-hidden border-t border-white/10 bg-[#0B111B]/95"
          >
            <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-2">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2 text-white/85 hover:text-white hover:bg-white/5 transition"
                >
                  {l.label}
                </a>
              ))}
              <a
                href="/app"
                onClick={() => setOpen(false)}
                className="mt-2 rounded-lg px-3 py-2 bg-emerald-400 text-[#0A111A] font-semibold text-center hover:brightness-110 transition"
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
