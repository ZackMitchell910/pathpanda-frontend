// SimButton.tsx — monochrome shell with subtle market glow
import * as React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  as?: "button" | "a";
  href?: string;
};

export default function SimButton({ as = "button", href, className = "", ...rest }: Props) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold " +
    "border border-white/18 bg-black/40 backdrop-blur " +
    "transition will-change-transform hover:translate-y-[0.5px] " +
    "shadow-[0_0_0_0_rgba(0,0,0,0)] hover:shadow-[0_0_24px_0_rgba(16,185,129,0.15)]";

  const accent =
    "relative isolate " +
    "before:absolute before:inset-0 before:rounded-xl before:pointer-events-none " +
    "before:bg-[conic-gradient(from_180deg_at_50%_50%,rgba(16,185,129,.22),rgba(59,130,246,.12),rgba(16,185,129,.22))] " +
    "before:opacity-60 before:blur-[12px] before:-z-10";

  const text = "text-emerald-200";

  const Comp: any = as === "a" ? "a" : "button";
  return <Comp href={href} className={`${base} ${accent} ${text} ${className}`} {...rest} />;
}
