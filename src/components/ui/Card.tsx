// src/components/ui/Card.tsx
import React, { useState, useId } from "react";
import type { ReactNode } from "react";
// If your theme file is at src/theme/chartTheme.ts and THIS file is in src/components/ui,
// the correct relative path is "../../theme/chartTheme".
import { PP_COLORS } from "../../theme/chartTheme";

type CardProps = {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  id?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
};

export const Card: React.FC<CardProps> = ({
  title,
  actions,
  children,
  className = "",
  headerClassName = "",
  bodyClassName = "",
  id,
  collapsible = false,
  defaultOpen = true,
}) => {
  const generatedId = useId();
  const panelId = id || `card-${generatedId}`;
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section
      id={panelId}
      className={`rounded-2xl border ${className}`}
      style={{ borderColor: PP_COLORS.cardBorder, background: PP_COLORS.cardBg }}
    >
      {(title || actions) && (
        <header
          className={`flex items-center justify-between px-4 py-3 border-b ${headerClassName}`}
          style={{ borderColor: PP_COLORS.cardBorder }}
        >
          <div className="flex items-center gap-2">
            {title && <h3 className="text-sm font-medium">{title}</h3>}
          </div>
          <div className="flex items-center gap-2">
            {actions}
            {collapsible && (
              <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="text-xs text-zinc-300 hover:text-white"
                aria-expanded={open}
                aria-controls={`${panelId}-body`}
              >
                {open ? "Hide" : "Show"}
              </button>
            )}
          </div>
        </header>
      )}

      {!collapsible || open ? (
        <div id={`${panelId}-body`} className={`p-4 ${bodyClassName}`}>
          {children}
        </div>
      ) : null}
    </section>
  );
};

export default Card;
