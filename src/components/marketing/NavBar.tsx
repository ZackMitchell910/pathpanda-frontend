import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

const baseNavClass =
  "relative inline-flex items-center rounded-lg px-3 py-1.5 text-sm text-white/80 transition hover:text-white";

const renderNavLink = (
  label: string,
  href: string,
  extraClassName = "",
  onClick?: () => void
) => {
  const className = `${baseNavClass} ${extraClassName}`.trim();
  const isInternal = href.startsWith("/") && !href.includes("#");
  return isInternal ? (
    <Link key={label} to={href} className={className} onClick={onClick}>
      {label}
    </Link>
  ) : (
    <a key={label} href={href} className={className} onClick={onClick}>
      {label}
    </a>
  );
};

export default function NavBar() {
  const [platformsOpen, setPlatformsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setPlatformsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setPlatformsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const platformLinks: Array<{ label: string; href: string }> = [
    { label: "Simetrix Dash", href: "/app" },
    { label: "AI Trader", href: "/trader" },
    { label: "Market Simulator", href: "/market-simulator" },
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
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              className={`${baseNavClass} gap-1 hover:[text-shadow:0_0_14px_rgba(255,255,255,0.85)]`}
              aria-expanded={platformsOpen}
              aria-haspopup="menu"
              onClick={() => setPlatformsOpen((prev) => !prev)}
            >
              Platforms
              <svg
                className={`mt-[1px] h-3 w-3 transition-transform ${
                  platformsOpen ? "rotate-180" : ""
                }`}
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M2 4.5L6 8.5L10 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </button>
            <div
              className={`absolute left-0 top-full z-20 mt-2 w-56 rounded-2xl border border-white/10 bg-black/90 p-2 shadow-xl transition ${
                platformsOpen
                  ? "pointer-events-auto opacity-100 translate-y-0"
                  : "pointer-events-none opacity-0 -translate-y-1"
              }`}
            >
              {platformLinks.map(({ label, href }) => {
                const isInternal = href.startsWith("/") && !href.includes("#");
                const commonClasses =
                  "block w-full rounded-xl px-3 py-2 text-left text-sm text-white/80 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-white/30";

                if (isInternal) {
                  return (
                    <button
                      type="button"
                      key={label}
                      className={commonClasses}
                      role="menuitem"
                      onClick={() => {
                        setPlatformsOpen(false);
                        navigate(href);
                      }}
                    >
                      {label}
                    </button>
                  );
                }

                return (
                  <a
                    key={label}
                    href={href}
                    className={commonClasses}
                    role="menuitem"
                    onClick={() => setPlatformsOpen(false)}
                  >
                    {label}
                  </a>
                );
              })}
            </div>
          </div>

          {items.map(([label, href]) =>
            renderNavLink(label, href, "inline-flex items-center", () => setPlatformsOpen(false)),
          )}
        </div>
      </div>
      <div className="border-b border-white/10" />
    </nav>
  );
}

