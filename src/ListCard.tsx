import * as React from "react";

type ListCardProps = {
  title: string;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;          // optional toolbar (e.g., Export)
  maxHeight?: number | string;      // e.g., 360 or "40vh"
  className?: string;
  children: React.ReactNode;
};

export default function ListCard({
  title,
  subtitle,
  right,
  maxHeight = 360,
  className = "",
  children,
}: ListCardProps) {
  return (
    <div className={`rounded-2xl border border-zinc-800/70 bg-zinc-900/60 shadow-sm ${className}`}>
      <div className="card-sticky px-4 py-3 border-b border-zinc-800/70 flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-zinc-100">{title}</div>
          {subtitle ? <div className="text-xs text-zinc-400 mt-0.5">{subtitle}</div> : null}
        </div>
        {right ? <div className="flex items-center gap-2">{right}</div> : null}
      </div>

      <div
        className="thin-scrollbar scroll-fade overflow-y-auto"
        style={{ maxHeight: typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight }}
      >
        {children}
      </div>
    </div>
  );
}
