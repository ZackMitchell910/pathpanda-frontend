import React from "react";

export type QuickSimItem = { symbol: string; horizon: number; paths: number };

export const QuickSimsPanel: React.FC<{
  title?: string;
  presets: QuickSimItem[];
  history: QuickSimItem[];
  onSelect: (q: QuickSimItem) => void;
}> = ({ title = "Quick Sims", presets, history, onSelect }) => {
  const Item = ({ item }: { item: QuickSimItem }) => (
    <button
      onClick={() => onSelect(item)}
      className="w-full text-left text-sm px-3 py-2 rounded-xl bg-[#27272A] border border-[#3F3F46] hover:bg-[#303036] transition"
      aria-label={`Load ${item.symbol} ${item.horizon}d, ${item.paths} paths`}
    >
      <div className="font-medium">{item.symbol} • {item.horizon}d</div>
      <div className="text-xs text-gray-300">{item.paths.toLocaleString()} paths</div>
    </button>
  );

  return (
    <aside className="space-y-3 md:sticky md:top-4">
      <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
      <div className="space-y-2">
        {presets.map((p, i) => <Item key={`p-${i}`} item={p} />)}
      </div>
      {!!history.length && (
        <>
          <h4 className="text-xs font-semibold text-gray-400 pt-2">Recent</h4>
          <div className="space-y-2">
            {history.slice(0, 12).map((h, i) => <Item key={`h-${i}-${h.symbol}-${h.horizon}`} item={h} />)}
          </div>
        </>
      )}
    </aside>
  );
};
