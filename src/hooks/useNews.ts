// src/hooks/useNews.ts
import { useCallback, useEffect, useRef, useState } from "react";

export type NewsItem = {
  id: string;
  title: string;
  url: string;
  published_at?: string;
  source?: string;
  summary?: string;
};

type UseNewsArgs = {
  symbol: string;
  includeNews: boolean;
  limit?: number;
  days?: number;
  retry?: number;
  apiBase: string;
  getHeaders: () => Record<string, string>;
  onLog?: (m: string) => void;
};

type UseNewsReturn = {
  items: NewsItem[];
  nextCursor: string | null;
  loading: boolean;
  error: string | null;
  loadMore: () => Promise<void>;
};

export default function useNews(args: UseNewsArgs): UseNewsReturn {
  const { symbol, includeNews, limit = 8, days = 7, retry = 0, apiBase, getHeaders, onLog } = args;

  const [items, setItems] = useState<NewsItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tried = useRef(0);

  // Single fetch function that takes a cursor arg so its identity
  // does NOT depend on "cursor" (prevents effect loops).
  const fetchNews = useCallback(
    async (cursorArg: string | null) => {
      if (!includeNews) return;
      setLoading(true);
      setError(null);
      try {
        const base = apiBase.replace(/\/+$/, "");
        const s = (symbol || "NVDA").toUpperCase();
        const headers = getHeaders();
        const key = headers["X-API-Key"] || (headers as any)["x-api-key"] || "";

        const params = new URLSearchParams({
          limit: String(limit),
          days: String(days),
        });
        if (cursorArg) params.set("cursor", cursorArg);
        if (key) params.set("api_key", key);

        const url = `${base}/api/news/${encodeURIComponent(s)}?${params.toString()}`;
        const r = await fetch(url, { headers });
        const text = await r.text();

        if (!r.ok) {
          if (/^\s*<!doctype html>|<html/i.test(text)) {
            throw new Error("Misrouted to HTML; check API base.");
          }
          const msg = `HTTP ${r.status} – ${text}`;
          setError(msg);
          onLog?.(`News error: ${msg}`);
          return; // do not retry on server error here
        }

        let data: any;
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(`Expected JSON, got: ${text.slice(0, 200)}`);
        }

        const list = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        setItems((prev) => (cursorArg ? [...prev, ...list] : list));
        setCursor(data?.nextCursor ?? null);
        onLog?.(`News: ${list.length} items${cursorArg ? " (more)" : ""}`);
      } catch (e: any) {
        const msg = e?.message || String(e);
        setError(msg);
        onLog?.(`News error: ${msg}`);
        // avoid infinite retry loops, especially on 401
        if (tried.current < (retry || 0) && !/HTTP 401/.test(msg)) {
          tried.current += 1;
          setTimeout(() => fetchNews(cursorArg), 800);
        }
      } finally {
        setLoading(false);
      }
    },
    [apiBase, symbol, limit, days, includeNews, getHeaders, onLog, retry]
  );

  // Reset & fetch on relevant inputs; DO NOT depend on "cursor" or "fetchNews" identity.
  useEffect(() => {
    setItems([]);
    setCursor(null);
    tried.current = 0;
    if (includeNews) {
      void fetchNews(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, includeNews, limit, days]);

  const loadMore = useCallback(async () => {
    if (!includeNews || !cursor || loading) return;
    await fetchNews(cursor);
  }, [includeNews, cursor, loading, fetchNews]);

  return { items, nextCursor: cursor, loading, error, loadMore };
}
