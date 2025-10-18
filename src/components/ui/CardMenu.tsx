import React, { useState, useRef, useEffect } from "react";

export function CardMenu({
  items,
  triggerLabel = "...",
  className = "",
  triggerTitle,
}: {
  items: { label: string; onClick: () => void; disabled?: boolean }[];
  triggerLabel?: React.ReactNode;
  className?: string;
  triggerTitle?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`px-2 py-1 rounded bg-[#161b22] border border-[#2a2f36] text-xs ${className}`}
        title={triggerTitle}
      >
        {triggerLabel}
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-36 rounded-md border border-[#2a2f36] bg-[#0f1318] p-1 shadow-lg">
          {items.map((item, index) => (
            <button
              key={index}
              type="button"
              disabled={item.disabled}
              onClick={() => {
                if (!item.disabled) {
                  setOpen(false);
                  item.onClick();
                }
              }}
              className={`w-full text-left px-2 py-1 text-xs rounded ${
                item.disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-white/5"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
