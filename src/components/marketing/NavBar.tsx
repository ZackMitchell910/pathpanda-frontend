import React from "react";
import { Link } from "react-router-dom";

const auraStyle = {
  background: "radial-gradient(120px 120px at 50% 50%, rgba(30,144,255,0.18), transparent 60%)",
};

const baseNavClass =
  "group relative rounded-lg px-3 py-1.5 text-sm text-white/80 transition hover:text-white";

const renderNavLink = (label: string, href: string, extraClassName = "") => {
  const className = `${baseNavClass} ${extraClassName}`.trim();
  const content = (
    <>
      <span
        className="pointer-events-none absolute -inset-2 -z-10 rounded-xl opacity-0 transition group-hover:opacity-100"
        style={auraStyle}
      />
      {label}
    </>
  );
  const isInternal = href.startsWith("/") && !href.includes("#");
  return isInternal ? (
    <Link key={label} to={href} className={className}>
      {content}
    </Link>
  ) : (
    <a key={label} href={href} className={className}>
      {content}
    </a>
  );
};

export default function NavBar() {
  const productLinks: Array<[string, string]> = [
    ["Simetrix Dash", "/app"],
    ["AI Trader", "/trader"],
    ["Market Simulator", "/market-simulator"],
  ];

  const items: Array<[string, string]> = [
    ["Features", "/#features"],
    ["Pricing", "/#pricing"],
    ["Docs", "/docs"],
    ["Trader Docs", "/docs/trader"],
    ["Open Dashboard", "/app"],
    ["Admin", "/admin"],
  ];

  return (
    <nav className="navbar">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6 md:px-8">
        <Link to="/" className="flex items-center gap-2">
          <span className="font-brand tracking-wide">SIMETRIX</span>
        </Link>

        <div className="flex items-center gap-2">
          <div className="group relative">
            <button type="button" className={`${baseNavClass} inline-flex items-center gap-1`}>
              <span
                className="pointer-events-none absolute -inset-2 -z-10 rounded-xl opacity-0 transition group-hover:opacity-100"
                style={auraStyle}
              />
              Products
              <svg
                className="mt-[1px] h-3 w-3 transition-transform group-hover:rotate-180"
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M2 4.5L6 8.5L10 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </button>
            <div className="pointer-events-none absolute left-0 top-full z-20 mt-2 w-56 rounded-2xl border border-white/10 bg-black/90 p-2 opacity-0 shadow-xl transition group-hover:pointer-events-auto group-hover:opacity-100">
              {productLinks.map(([label, href]) =>
                renderNavLink(label, href, "block w-full px-3 py-2 text-left hover:bg-white/5 rounded-xl"),
              )}
            </div>
          </div>

          {items.map(([label, href]) => renderNavLink(label, href, "inline-flex items-center"))}
        </div>
      </div>
      <div className="border-b border-white/10" />
    </nav>
  );
}
