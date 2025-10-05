// src/components/InlineLegend.tsx
export function InlineLegend({ items }: { items: { swatch: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-300">
      {items.map((it, i) => (
        <span key={i} className="inline-flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: it.swatch }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}
