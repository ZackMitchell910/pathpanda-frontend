import React, { useState, useRef, useEffect } from "react";

export function CardMenu({
  items,
}: { items: { label: string; onClick: () => void; disabled?: boolean }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc); return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} className="px-2 py-1 rounded bg-[#161b22] border border-[#2a2f36] text-xs">⋯</button>
      {open && (
        <div className="absolute right-0 mt-1 w-36 rounded-md border border-[#2a2f36] bg-[#0f1318] p-1 shadow-lg">
          {items.map((it, i) => (
            <button
              key={i}
              disabled={it.disabled}
              onClick={() => { if (!it.disabled) { setOpen(false); it.onClick(); } }}
              className={`w-full text-left px-2 py-1 text-xs rounded ${it.disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-white/5"}`}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
