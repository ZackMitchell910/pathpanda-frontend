import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTickerSearch } from "@/hooks/useTickerSearch";
import type { TickerSuggestion } from "@/hooks/useTickerSearch";

type Props = {
  value: string;
  onChange: (next: string) => void;
  apiKey?: string;
  placeholder?: string;
  className?: string;
};

export const TickerAutocomplete: React.FC<Props> = ({
  value,
  onChange,
  apiKey,
  placeholder = "e.g., NVDA",
  className = "",
}) => {
  const sanitize = useCallback((text: string) => text.replace(/[^A-Za-z0-9.\-:]/g, "").toUpperCase(), []);

  const [inputValue, setInputValue] = useState(() => sanitize(value || ""));
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const hasApiKey = typeof apiKey === "string" && apiKey.trim().length > 0;

  const commitValue = useCallback(
    (next: string) => {
      const cleaned = sanitize(next);
      setInputValue(cleaned);
      onChange(cleaned);
      setIsEditing(false);
    },
    [onChange, sanitize]
  );

  useEffect(() => {
    if (isEditing) return;
    const cleaned = sanitize(value || "");
    if (cleaned !== inputValue) {
      setInputValue(cleaned);
    }
  }, [value, inputValue, sanitize, isEditing]);

  const { suggestions, loading, error, hasCompleted } = useTickerSearch(inputValue, {
    enabled: hasApiKey && (open || hasInteracted),
    apiKey: hasApiKey ? apiKey : undefined,
  });

  useEffect(() => {
    if (!open) {
      setHighlighted(0);
    } else {
      setHighlighted((current) => (suggestions.length ? Math.min(current, suggestions.length - 1) : 0));
    }
  }, [open, suggestions.length]);

  const closeDropdown = useCallback(() => {
    setOpen(false);
    setHighlighted(0);
  }, []);

  const selectSuggestion = useCallback(
    (item: TickerSuggestion) => {
      if (!item) return;
      commitValue(item.ticker);
      closeDropdown();
    },
    [closeDropdown, commitValue]
  );

  const handleFocus = useCallback(() => {
    setOpen(true);
  }, []);

  const handleBlur = useCallback(() => {
    commitValue(inputValue);
    closeDropdown();
  }, [closeDropdown, commitValue, inputValue]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (!open && ["ArrowDown", "ArrowUp", "Enter"].includes(event.key)) {
        setOpen(true);
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlighted((prev) => (suggestions.length ? Math.min(prev + 1, suggestions.length - 1) : prev));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlighted((prev) => (suggestions.length ? Math.max(prev - 1, 0) : prev));
      } else if (event.key === "Enter") {
        if (open && suggestions[highlighted]) {
          event.preventDefault();
          selectSuggestion(suggestions[highlighted]);
        } else {
          commitValue(inputValue);
          closeDropdown();
        }
      } else if (event.key === "Escape") {
        closeDropdown();
      }
    },
    [closeDropdown, highlighted, open, selectSuggestion, suggestions, commitValue, inputValue]
  );

  const infoState = useMemo(() => {
    const trimmed = (value || "").trim().toUpperCase();
    if (!trimmed) return { supported: true, show: false };
    const exact = suggestions.some((item) => item.ticker === trimmed);
    const show = hasCompleted && !loading && !exact;
    return { supported: exact, show };
  }, [value, suggestions, loading, hasCompleted]);

  const showInfoBadge = useMemo(() => !open && infoState.show, [infoState.show, open]);
  const inputPaddingClass = showInfoBadge ? "pr-9" : "";

  const renderSuggestion = (item: TickerSuggestion, index: number) => {
    const active = index === highlighted;
    return (
      <button
        key={item.ticker}
        type="button"
        className={`flex w-full items-start justify-between gap-2 rounded-md px-3 py-2 text-left text-xs transition ${
          active ? "bg-white/15 text-white" : "text-white/80 hover:bg-white/10"
        }`}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => selectSuggestion(item)}
        role="option"
        aria-selected={active}
      >
        <div className="flex-1">
          <div className="font-semibold text-white">{item.ticker}</div>
          {item.name && <div className="mt-0.5 text-[11px] text-white/70">{item.name}</div>}
        </div>
        <div className="text-[10px] uppercase text-white/50">
          {[item.market, item.type].filter(Boolean).join(" / ")}
        </div>
      </button>
    );
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <input
        value={inputValue}
        onChange={(event) => {
          setHasInteracted(true);
          setIsEditing(true);
          const next = sanitize(event.currentTarget.value);
          setInputValue(next);
          if (!open) setOpen(true);
        }}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full rounded-lg border border-white/15 bg-black/50 px-2 py-2 text-sm text-white placeholder-white/40 focus:border-white/25 focus:outline-none focus:ring-1 focus:ring-white/30 ${inputPaddingClass}`}
        autoComplete="off"
        spellCheck={false}
        inputMode="text"
      />

      {showInfoBadge && (
        <div
          className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[11px] text-white/50"
          title="This ticker is not yet supported."
        >
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/30 text-[10px] font-semibold text-white/60" aria-hidden="true">
            i
          </span>
        </div>
      )}

      {open && (
        <div className="absolute left-0 right-0 z-30 mt-1 max-h-64 overflow-auto rounded-lg border border-white/15 bg-[#0B0F15] shadow-xl">
          {!hasApiKey && (
            <div className="px-3 py-3 text-xs text-white/60">
              Provide a Polygon API key to load ticker suggestions.
            </div>
          )}
          {hasApiKey && loading && (
            <div className="px-3 py-3 text-xs text-white/60">
              Searching Polygon for matching tickers...
            </div>
          )}
          {hasApiKey && !loading && error && (
            <div className="px-3 py-3 text-xs text-rose-400">
              {error}
            </div>
          )}
          {hasApiKey && !loading && !error && suggestions.length === 0 && (
            <div className="px-3 py-3 text-xs text-white/60">No Polygon matches yet.</div>
          )}
          {hasApiKey && !loading && !error && suggestions.length > 0 && (
            <div role="listbox" aria-label="Ticker suggestions">
              {suggestions.map(renderSuggestion)}
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default TickerAutocomplete;
