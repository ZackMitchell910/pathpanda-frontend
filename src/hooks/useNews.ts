// src/hooks/useNews.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// hooks/useNews.ts (inside your fetcher)
const API_BASE =
  (typeof window !== "undefined" && (window as any).__PP_API_BASE__) ||
  (import.meta as any)?.env?.VITE_PREDICTIVE_API ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "";

const api = (p: string) => (API_BASE ? `${API_BASE}${p}` : p);

// then use: fetch(api(`/api/news/${symbol}?limit=${limit}&days=${days}`), { headers: … })

export type NewsItem = {
  id?: string;
  url: string;
  title: string;
  source?: string;
  published_at?: string;
  sentiment?: number;
  image_url?: string;
};

type UseNewsOpts = {
  symbol: string;
  includeNews: boolean;
  apiKey: string;
  limit?: number;
  days?: number;
  onLog?: (m: string) => void;
  retry?: number; // retries on non-200
};

type HookState = {
  items: NewsItem[];
  nextCursor: string | null;
  loading: boolean;
  error: string | null;
};

export function useNews({
  symbol,
  includeNews,
  apiKey,
  limit = 6,
  days = 7,
  onLog,
  retry = 0,
}: UseNewsOpts) {
  const [state, setState] = useState<HookState>({
    items: [],
    nextCursor: null,
    loading: false,
    error: null,
  });

  const cursorRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const canFetch = useMemo(
    () => includeNews && !!symbol && !!apiKey,
    [includeNews, symbol, apiKey]
  );

  const reset = useCallback(() => {
    cursorRef.current = null;
    setState({ items: [], nextCursor: null, loading: false, error: null });
  }, []);

  const fetchPage = useCallback(
    async (append: boolean) => {
      if (!canFetch || state.loading) return;
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      setState((s) => ({ ...s, loading: true, error: null }));
      const qs = new URLSearchParams();
      qs.set("limit", String(limit));
      qs.set("days", String(days));
      if (cursorRef.current) qs.set("cursor", cursorRef.current);

      const url = `/api/news/${encodeURIComponent(symbol)}?${qs.toString()}`;
      let attempts = 0;
      while (true) {
        try {
          const res = await fetch(url, {
            headers: { "X-API-Key": apiKey },
            signal: ctrl.signal,
          });
          if (!res.ok) {
            const txt = await res.text();
            throw new Error(`HTTP ${res.status} — ${txt || res.statusText}`);
          }
          const data = await res.json() as {
            items?: NewsItem[];
            next_cursor?: string | null;
          };

          const newItems = data.items ?? [];
          const next = data.next_cursor ?? null; // snake_case → camelCase mapping

          setState((s) => ({
            items: append ? s.items.concat(newItems) : newItems,
            nextCursor: next,
            loading: false,
            error: null,
          }));
          cursorRef.current = next;
          onLog?.(
            `News: fetched ${newItems.length} item(s)${
              next ? ` (next_cursor=${next})` : " (end)"
            }`
          );
          return;
        } catch (e: any) {
          attempts++;
          if (attempts > retry || ctrl.signal.aborted) {
            setState((s) => ({
              ...s,
              loading: false,
              error: e?.message || String(e),
            }));
            onLog?.(`News error: ${e?.message || e}`);
            return;
          }
          await new Promise((r) => setTimeout(r, 400 * attempts));
        }
      }
    },
    [apiKey, canFetch, days, limit, onLog, retry, state.loading, symbol]
  );

  // initial & dependency changes
  useEffect(() => {
    if (!includeNews) {
      reset();
      return;
    }
    if (canFetch) fetchPage(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeNews, symbol, apiKey, limit, days]);

  // cleanup on unmount
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const loadMore = useCallback(() => {
    if (state.nextCursor) fetchPage(true);
  }, [fetchPage, state.nextCursor]);

  return {
    items: state.items,
    nextCursor: state.nextCursor,
    loading: state.loading,
    error: state.error,
    loadMore,
  };
}
