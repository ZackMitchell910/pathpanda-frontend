import { useEffect, useMemo, useRef, useState } from "react";

export type TickerSuggestion = {
  ticker: string;
  name: string;
  market: string;
  locale: string;
  primary_exchange?: string;
  type?: string;
};

type Options = {
  enabled?: boolean;
  apiKey?: string;
  maxResults?: number;
  debounceMs?: number;
};

type HookState = {
  suggestions: TickerSuggestion[];
  loading: boolean;
  error: string | null;
  hasCompleted: boolean;
};

const DEFAULT_ENDPOINT = "https://api.polygon.io/v3/reference/tickers";
const MARKETS: Array<"stocks" | "crypto"> = ["stocks", "crypto"];

const sanitizeQuery = (text: string) => text.replace(/[^A-Za-z0-9.\-:]/g, "").toUpperCase();

const mapResult = (raw: any): TickerSuggestion | null => {
  if (!raw || typeof raw !== "object") return null;
  const ticker = typeof raw.ticker === "string" ? raw.ticker.trim().toUpperCase() : "";
  if (!ticker) return null;
  return {
    ticker,
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : ticker,
    market: typeof raw.market === "string" ? raw.market : "",
    locale: typeof raw.locale === "string" ? raw.locale : "",
    primary_exchange: typeof raw.primary_exchange === "string" ? raw.primary_exchange : undefined,
    type: typeof raw.type === "string" ? raw.type : undefined,
  };
};

const dedupeSuggestions = (items: TickerSuggestion[], maxResults: number) => {
  const seen = new Set<string>();
  const out: TickerSuggestion[] = [];
  for (const item of items) {
    if (!item) continue;
    if (seen.has(item.ticker)) continue;
    seen.add(item.ticker);
    out.push(item);
    if (out.length >= maxResults) break;
  }
  return out;
};

export function useTickerSearch(query: string, opts: Options = {}): HookState {
  const { enabled = true, apiKey, maxResults = 60, debounceMs = 250 } = opts;
  const [suggestions, setSuggestions] = useState<TickerSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCompleted, setHasCompleted] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const [debouncedQuery, setDebouncedQuery] = useState(query);
  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedQuery(query), debounceMs);
    return () => window.clearTimeout(handle);
  }, [query, debounceMs]);

  const key = useMemo(() => {
    if (typeof apiKey === "string" && apiKey.trim()) return apiKey.trim();
    const envKey =
      (import.meta as any)?.env?.VITE_POLYGON_API_KEY ||
      (import.meta as any)?.env?.VITE_POLYGON_KEY ||
      (typeof window !== "undefined" ? window.localStorage?.getItem("polygon_api_key") : undefined);
    return typeof envKey === "string" && envKey.trim() ? envKey.trim() : "DEMO";
  }, [apiKey]);

  useEffect(() => {
    if (!enabled) {
      setSuggestions([]);
      setLoading(false);
      setError(null);
      setHasCompleted(false);
      return () => {};
    }
    const q = sanitizeQuery(debouncedQuery);
    if (!q) {
      setSuggestions([]);
      setLoading(false);
      setError(null);
      setHasCompleted(false);
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      return () => {};
    }

    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    const search = async () => {
      try {
        setLoading(true);
        setError(null);
        setHasCompleted(false);

        const queryLength = q.length;
        const perMarketLimit = (() => {
          if (queryLength <= 1) return Math.min(100, Math.max(maxResults * 2, 100));
          if (queryLength === 2) return Math.min(100, Math.max(Math.round(maxResults * 1.5), 80));
          return Math.min(100, Math.max(maxResults, 50));
        })();

        const params = new URLSearchParams({
          "ticker.search": q,
          active: "true",
          sort: "ticker",
          order: "asc",
          limit: String(perMarketLimit),
        });

        const responses = await Promise.all(
          MARKETS.map((market) =>
            fetch(`${DEFAULT_ENDPOINT}?${params.toString()}&market=${market}&apiKey=${encodeURIComponent(key)}`, {
              signal: controller.signal,
              headers: {
                Accept: "application/json",
              },
            }).then(async (res) => {
              if (!res.ok) {
                const text = await res.text().catch(() => "");
                throw new Error(text || `Polygon error ${res.status}`);
              }
              return res.json();
            })
          )
        );

        const collected = responses
          .flatMap((payload: any) =>
            Array.isArray(payload?.results) ? payload.results.map(mapResult).filter(Boolean) : []
          ) as TickerSuggestion[];

        const deduped = dedupeSuggestions(collected, maxResults);
        deduped.sort((a, b) => {
          const priority = (ticker: string) =>
            ticker === q ? 0 : ticker.startsWith(q) ? 1 : ticker.includes(q) ? 2 : 3;
          const pa = priority(a.ticker);
          const pb = priority(b.ticker);
          if (pa !== pb) return pa - pb;
          return a.ticker.localeCompare(b.ticker);
        });

        setSuggestions(deduped);
        setError(null);
      } catch (err: any) {
        if (controller.signal.aborted) return;
        setError(err?.message || "Ticker lookup failed.");
        setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setHasCompleted(true);
        }
      }
    };

    search();

    return () => {
      controller.abort();
    };
  }, [debouncedQuery, enabled, key, maxResults]);

  return { suggestions, loading, error, hasCompleted };
}
