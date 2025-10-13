import * as React from "react";
import logo from "@/assets/brand/simetrix-logo.png";

export type LogoSimetrixProps = {
  /** Target pixel height (width auto). */
  size?: number;
  /** Accessible alt text. Use `decorative` to hide from screen readers. */
  alt?: string;
  decorative?: boolean;
  className?: string;
  style?: React.CSSProperties;
  /** (Optional) override the default logo asset path */
  src?: string;

  // --- legacy props safely ignored (so older calls won’t break) ---
  tone?: "dark" | "light";
  lockup?: "icon" | "horizontal" | "stacked";
  withWordmark?: boolean;
  iconOnly?: boolean;
  animated?: boolean;
  wordmarkSize?: number;
  gap?: number;
  color?: string;
  textColor?: string;
};

export default function LogoSimetrix({
  size = 28,
  alt = "SIMETRIX",
  decorative = false,
  className = "",
  style,
  src,
}: LogoSimetrixProps) {
  const srcFinal = src ?? logo;
  return (
    <img
      src={srcFinal}
      alt={decorative ? "" : alt}
      aria-hidden={decorative ? true : undefined}
      height={size}
      style={{ height: size, width: "auto", display: "block", ...style }}
      className={className}
      loading="eager"
      decoding="async"
      draggable={false}
    />
  );
}
