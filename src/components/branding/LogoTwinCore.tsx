import * as React from "react";

type Props = {
  size?: number;          // pixel size of the icon square
  strokeWidth?: number;   // outline thickness
  glow?: boolean;         // subtle outer glow for dark UIs
  withWordmark?: boolean; // append SIMETRIX wordmark at the right
  wordmarkSize?: number;  // font size of the wordmark (px)
  align?: "center" | "start";
  className?: string;
  title?: string;
};

const EMERALD = "#34D399"; // tailwind emerald-400
const CYAN    = "#7DD3FC"; // tailwind sky-300-ish
const IVORY   = "#F9F8F3";

export default function LogoTwinCore({
  size = 32,
  strokeWidth = 1.8,
  glow = true,
  withWordmark = false,
  wordmarkSize = Math.round(size * 0.62),
  align = "start",
  className = "",
  title = "Simetrix — Twin Core",
}: Props) {
  const vb = 64; // canonical viewBox for crisp scaling
  const id = React.useId();
  const g1 = `grad-a-${id}`;
  const g2 = `grad-b-${id}`;
  const glowId = `glow-${id}`;

  const Icon = (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${vb} ${vb}`}
      role="img"
      aria-label={title}
      className={className}
    >
      <defs>
        <linearGradient id={g1} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%"  stopColor={EMERALD} />
          <stop offset="100%" stopColor={CYAN} />
        </linearGradient>
        <linearGradient id={g2} x1="1" x2="0" y1="0" y2="1">
          <stop offset="0%"  stopColor={CYAN} />
          <stop offset="100%" stopColor={EMERALD} />
        </linearGradient>

        {/* Soft outer glow (great on dark backgrounds) */}
        <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Two interlocked rings */}
      <g filter={glow ? `url(#${glowId})` : undefined}>
        <circle
          cx="24" cy="32" r="17.5"
          fill="none"
          stroke={`url(#${g1})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <circle
          cx="40" cy="32" r="17.5"
          fill="none"
          stroke={`url(#${g2})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Diamond “twin-core” join — subtle fill with gradient fade */}
        <path
          d="M32 23 L37 28 L32 33 L27 28 Z"
          fill={IVORY}
          fillOpacity="0.08"
        />
        <path
          d="M32 25.5 L34.8 28.3 L32 31.1 L29.2 28.3 Z"
          fill={`url(#${g1})`}
          fillOpacity="0.35"
        />
      </g>
    </svg>
  );

  if (!withWordmark) return Icon;

  return (
    <div
      aria-label={title}
      className="flex items-center"
      style={{ justifyContent: align === "center" ? "center" : "flex-start", gap: Math.max(6, Math.round(size * 0.25)) }}
    >
      {Icon}
      <span
        style={{
          fontSize: wordmarkSize,
          letterSpacing: "0.06em",
          fontWeight: 600,
          color: IVORY,
          lineHeight: 1,
        }}
      >
        SIMETRIX
      </span>
    </div>
  );
}
