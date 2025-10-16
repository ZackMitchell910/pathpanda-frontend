import React from "react";
import { Link } from "react-router-dom";
export default function NavBar() {
  const items: Array<[string, string]> = [
    ["Products", "/#products"],
    ["Features", "/#features"],
    ["Pricing", "/#pricing"],
    ["Docs", "/docs"],
    ["Open Dashboard", "/app"],
  ];

  return (
    <nav className="navbar">
      <div className="mx-auto max-w-7xl px-6 md:px-8 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="font-brand tracking-wide">SIMETRIX</span>
        </Link>

        <div className="flex items-center gap-2">
          {items.map(([label, href]) => (
            <a
              key={label}
              href={href}
              className="relative rounded-lg px-3 py-1.5 text-sm text-white/80 hover:text-white transition"
            >
              {/* blue aura hover (matches --accent in globals.css) */}
              <span
                className="pointer-events-none absolute -inset-2 -z-10 opacity-0 hover:opacity-100 rounded-xl transition"
                style={{
                  background:
                    "radial-gradient(120px 120px at 50% 50%, rgba(30,144,255,0.18), transparent 60%)",
                }}
              />
              {label}
            </a>
          ))}
        </div>
      </div>
      <div className="border-b border-white/10" />
    </nav>
  );
}
